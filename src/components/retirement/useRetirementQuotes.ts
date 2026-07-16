"use client";

import { useCallback, useSyncExternalStore } from "react";
import { SEED_QUOTES } from "@/lib/retirement/data";
import type { StockQuote, Ticker } from "@/lib/retirement/types";

const STORAGE_KEY = "sh_retirement_quotes";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function loadQuotes(): StockQuote[] {
  if (typeof window === "undefined") return SEED_QUOTES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_QUOTES;
    const parsed = JSON.parse(raw) as Partial<StockQuote>[];
    return SEED_QUOTES.map((seed) => {
      const saved = parsed.find((p) => p.ticker === seed.ticker);
      if (!saved) return seed;
      return {
        ...seed,
        price: typeof saved.price === "number" ? saved.price : seed.price,
        peRatio: typeof saved.peRatio === "number" ? saved.peRatio : seed.peRatio,
        dps: typeof saved.dps === "number" ? saved.dps : seed.dps,
      };
    });
  } catch {
    return SEED_QUOTES;
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): StockQuote[] {
  return loadQuotes();
}

function getServerSnapshot(): StockQuote[] {
  return SEED_QUOTES;
}

export function useRetirementQuotes() {
  const quotes = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateQuote = useCallback((ticker: Ticker, patch: Partial<StockQuote>) => {
    const current = loadQuotes();
    const next = current.map((q) => (q.ticker === ticker ? { ...q, ...patch } : q));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  const resetQuotes = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    emit();
  }, []);

  return { quotes, ready: true, updateQuote, resetQuotes };
}
