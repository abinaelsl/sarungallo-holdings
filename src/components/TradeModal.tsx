"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Modal } from "./Modal";
import { Button, Field, Input, Textarea } from "./ui";
import { Holding, TxnType } from "@/lib/types";
import { usePortfolio } from "./PortfolioProvider";
import { usdPerNative } from "@/lib/calc";
import { formatNumber, formatUSD } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TradeModal({
  open,
  onClose,
  holding,
  initialType = "buy",
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  holding: Holding;
  initialType?: TxnType;
  onDone?: () => void;
}) {
  const { addTransaction } = usePortfolio();
  const [type, setType] = useState<TxnType>(initialType);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed type when reopened with a different intent.
  const [seededType, setSeededType] = useState(initialType);
  if (open && initialType !== seededType) {
    setSeededType(initialType);
    setType(initialType);
  }

  const cur = holding.currency || "USD";
  const ratio = usdPerNative(holding);

  const preview = useMemo(() => {
    const s = parseFloat(shares);
    const p = parseFloat(price);
    const f = parseFloat(fees) || 0;
    if (!Number.isFinite(s) || s <= 0 || !Number.isFinite(p) || p < 0) return null;

    const q = holding.quantity ?? 0;
    const avgNat = holding.avg_cost_native ?? p;

    if (type === "buy") {
      const newQty = q + s;
      const newCostNative = q * avgNat + s * p + f;
      const newAvg = newQty > 0 ? newCostNative / newQty : 0;
      return {
        newQty,
        newAvg,
        cashNative: s * p + f,
        realizedNative: null as number | null,
      };
    }
    const sellQty = Math.min(s, q);
    const newQty = Math.max(0, q - s);
    const realizedNative = sellQty * (p - avgNat) - f;
    return {
      newQty,
      newAvg: avgNat, // average cost unchanged on a sell
      cashNative: s * p - f,
      realizedNative,
    };
  }, [shares, price, fees, type, holding]);

  const fmtNat = (v: number) => `${formatNumber(v, 2)} ${cur}`;
  const fmtNatUsd = (v: number) => formatUSD(v * ratio);

  async function submit() {
    setError(null);
    const s = parseFloat(shares);
    const p = parseFloat(price);
    if (!Number.isFinite(s) || s <= 0) return setError("Enter a share quantity.");
    if (!Number.isFinite(p) || p < 0) return setError("Enter a price per share.");
    setSaving(true);
    const ok = await addTransaction(holding.id, {
      type,
      trade_date: date,
      shares: s,
      price_native: p,
      fees_native: parseFloat(fees) || 0,
      currency: cur,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) {
      setShares("");
      setPrice("");
      setFees("");
      setNotes("");
      onDone?.();
      onClose();
    } else {
      setError("Could not save. Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Trade — ${holding.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : type === "buy" ? "Record buy" : "Record sell"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Buy / Sell toggle */}
        <div className="flex rounded-lg border border-border bg-surface-2 p-1">
          {(["buy", "sell"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors cursor-pointer",
                type === t
                  ? t === "buy"
                    ? "bg-gain/15 text-gain"
                    : "bg-loss/15 text-loss"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t === "buy" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {t === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Shares">
            <Input
              type="number"
              step="any"
              min="0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="1000"
            />
          </Field>
          <Field label={`Price / share (${cur})`}>
            <Input
              type="number"
              step="any"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={holding.current_price_native != null ? String(holding.current_price_native) : "0"}
            />
          </Field>
          <Field label={`Fees (${cur})`} hint="Optional">
            <Input
              type="number"
              step="any"
              min="0"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional…"
          />
        </Field>

        {/* Live average-cost preview */}
        {preview && (
          <div className="rounded-lg border border-border bg-surface-2/60 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              After this {type}
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted">New quantity</span>
              <span className="text-right text-foreground tnum">
                {formatNumber(preview.newQty, 4)}
              </span>
              <span className="text-muted">New average cost</span>
              <span className="text-right text-foreground tnum">
                {fmtNat(preview.newAvg)}
              </span>
              <span className="text-muted">
                {type === "buy" ? "Cash invested" : "Proceeds"}
              </span>
              <span className="text-right text-foreground tnum">
                {fmtNat(preview.cashNative)}{" "}
                <span className="text-muted">· {fmtNatUsd(preview.cashNative)}</span>
              </span>
              {preview.realizedNative != null && (
                <>
                  <span className="text-muted">Realized P/L</span>
                  <span
                    className={cn(
                      "text-right tnum",
                      preview.realizedNative >= 0 ? "text-gain" : "text-loss",
                    )}
                  >
                    {fmtNat(preview.realizedNative)}{" "}
                    <span className="opacity-70">
                      · {fmtNatUsd(preview.realizedNative)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-sm text-loss">{error}</div>}
      </div>
    </Modal>
  );
}
