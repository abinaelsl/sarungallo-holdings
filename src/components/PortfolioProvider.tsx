"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Holding, HoldingInput, Snapshot } from "@/lib/types";

export type DisplayCurrency = "USD" | "IDR";

interface PortfolioContextValue {
  holdings: Holding[];
  snapshots: Snapshot[];
  loading: boolean;
  refreshing: boolean;
  lastError: string | null;
  fxUsdIdr: number;
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  reload: () => Promise<void>;
  refreshPrices: () => Promise<{ ok: boolean; failures?: string[] } | void>;
  createHolding: (input: Partial<HoldingInput>) => Promise<Holding | null>;
  updateHolding: (id: string, input: Partial<HoldingInput>) => Promise<Holding | null>;
  deleteHolding: (id: string) => Promise<boolean>;
  addTransaction: (
    holdingId: string,
    input: Record<string, unknown>,
  ) => Promise<boolean>;
  deleteTransaction: (txId: string) => Promise<boolean>;
  addDividend: (
    holdingId: string,
    input: Record<string, unknown>,
  ) => Promise<boolean>;
  deleteDividend: (divId: string) => Promise<boolean>;
  /** Convert a USD amount into the active display currency. */
  toDisplay: (usd: number | null | undefined) => number | null;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const DEFAULT_FX = 16000;

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fxUsdIdr, setFxUsdIdr] = useState(DEFAULT_FX);
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");

  const reload = useCallback(async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch("/api/holdings", { cache: "no-store" }),
        fetch("/api/snapshots?limit=500", { cache: "no-store" }),
      ]);
      const hJson = await hRes.json().catch(() => ({}));
      const sJson = await sRes.json().catch(() => ({}));
      if (!hRes.ok || !sRes.ok) {
        setLastError(hJson.error || sJson.error || "Failed to load");
        return;
      }
      if (hJson.holdings) setHoldings(hJson.holdings);
      if (sJson.snapshots) {
        setSnapshots(sJson.snapshots);
        const last = sJson.snapshots[sJson.snapshots.length - 1];
        if (last?.fx_usd_idr) setFxUsdIdr(Number(last.fx_usd_idr));
      }
      setLastError(null);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const saved =
      typeof window !== "undefined"
        ? (localStorage.getItem("sh_currency") as DisplayCurrency | null)
        : null;
    if (saved === "USD" || saved === "IDR") setCurrency(saved);
  }, [reload]);

  const changeCurrency = useCallback((c: DisplayCurrency) => {
    setCurrency(c);
    if (typeof window !== "undefined") localStorage.setItem("sh_currency", c);
  }, []);

  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    setLastError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setLastError(json.error ?? "Refresh failed");
        return { ok: false };
      }
      if (json.holdings) setHoldings(json.holdings);
      if (json.fx_usd_idr) setFxUsdIdr(Number(json.fx_usd_idr));
      // Append the new snapshot locally — avoid a full holdings+snapshots refetch.
      if (json.snapshot) {
        setSnapshots((prev) => {
          const next = [...prev, json.snapshot as Snapshot];
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });
      }
      return { ok: true, failures: json.failures as string[] };
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Refresh failed");
      return { ok: false };
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createHolding = useCallback(
    async (input: Partial<HoldingInput>) => {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        setLastError(json.error ?? "Create failed");
        return null;
      }
      await reload();
      return json.holding as Holding;
    },
    [reload],
  );

  const updateHolding = useCallback(
    async (id: string, input: Partial<HoldingInput>) => {
      const res = await fetch(`/api/holdings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        setLastError(json.error ?? "Update failed");
        return null;
      }
      await reload();
      return json.holding as Holding;
    },
    [reload],
  );

  const deleteHolding = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/holdings/${id}`, { method: "DELETE" });
      if (!res.ok) return false;
      await reload();
      return true;
    },
    [reload],
  );

  const addTransaction = useCallback(
    async (holdingId: string, input: Record<string, unknown>) => {
      const res = await fetch(`/api/holdings/${holdingId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setLastError(j.error ?? "Could not save transaction");
        return false;
      }
      await reload();
      return true;
    },
    [reload],
  );

  const deleteTransaction = useCallback(
    async (txId: string) => {
      const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
      if (!res.ok) return false;
      await reload();
      return true;
    },
    [reload],
  );

  const addDividend = useCallback(
    async (holdingId: string, input: Record<string, unknown>) => {
      const res = await fetch(`/api/holdings/${holdingId}/dividends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setLastError(j.error ?? "Could not save dividend");
        return false;
      }
      await reload();
      return true;
    },
    [reload],
  );

  const deleteDividend = useCallback(
    async (divId: string) => {
      const res = await fetch(`/api/dividends/${divId}`, { method: "DELETE" });
      if (!res.ok) return false;
      await reload();
      return true;
    },
    [reload],
  );

  const toDisplay = useCallback(
    (usd: number | null | undefined) => {
      if (usd == null) return null;
      return currency === "USD" ? usd : usd * fxUsdIdr;
    },
    [currency, fxUsdIdr],
  );

  const value = useMemo<PortfolioContextValue>(
    () => ({
      holdings,
      snapshots,
      loading,
      refreshing,
      lastError,
      fxUsdIdr,
      currency,
      setCurrency: changeCurrency,
      reload,
      refreshPrices,
      createHolding,
      updateHolding,
      deleteHolding,
      addTransaction,
      deleteTransaction,
      addDividend,
      deleteDividend,
      toDisplay,
    }),
    [
      holdings,
      snapshots,
      loading,
      refreshing,
      lastError,
      fxUsdIdr,
      currency,
      changeCurrency,
      reload,
      refreshPrices,
      createHolding,
      updateHolding,
      deleteHolding,
      addTransaction,
      deleteTransaction,
      addDividend,
      deleteDividend,
      toDisplay,
    ],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
