"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Field, Input } from "./ui";
import { Holding } from "@/lib/types";
import { lotSize, usdPerNative } from "@/lib/calc";
import { formatNative, formatNumber, formatUSD } from "@/lib/format";

export function AvgCalcPanel({ holding }: { holding: Holding }) {
  const cur = holding.currency || "USD";
  const lot = lotSize(holding);
  const usesLots = lot > 1;
  const ratio = usdPerNative(holding);

  const [target, setTarget] = useState("");
  const [buy, setBuy] = useState("");

  const curAvg = holding.avg_cost_native ?? 0;
  const curShares = holding.quantity ?? 0;

  const result = useMemo(() => {
    const T = parseFloat(target);
    const P = parseFloat(buy);
    if (!Number.isFinite(T) || !Number.isFinite(P) || T <= 0 || P <= 0) return null;
    if (curShares <= 0 || curAvg <= 0) {
      return { error: "Add a position first to calculate against an average." };
    }
    if (P >= curAvg) {
      return { error: "To lower your average, the buy price must be below your current average." };
    }
    if (T <= P || T >= curAvg) {
      return {
        error: `Target average must be between your buy price (${formatNative(P, cur)}) and current average (${formatNative(curAvg, cur)}).`,
      };
    }
    // x = currentShares * (T - curAvg) / (P - T)
    const x = (curShares * (T - curAvg)) / (P - T);
    if (!Number.isFinite(x) || x <= 0) return { error: "No solution for those values." };
    // Round lots up so cash / resulting holding match the whole-lot purchase.
    const buyShares = usesLots ? Math.ceil(x / lot) * lot : x;
    const cost = buyShares * P;
    return {
      shares: buyShares,
      lots: buyShares / lot,
      cost,
      newShares: curShares + buyShares,
    };
  }, [target, buy, curAvg, curShares, lot, cur, usesLots]);

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2">
        <Calculator size={18} className="text-gold" />
        <h3 className="font-serif text-lg text-foreground">Average Price Calculator</h3>
      </div>
      <p className="mt-1 mb-4 text-sm text-muted">
        Enter your target average price and the price you plan to buy at — we&rsquo;ll tell
        you how {usesLots ? "many lots" : "many shares"} you need.
      </p>

      <div className="mb-4 rounded-lg border border-border bg-surface-2/50 p-3 text-sm">
        <div>
          <span className="text-muted">Current avg:</span>{" "}
          <span className="font-medium text-foreground">{formatNative(curAvg, cur)}</span>
        </div>
        <div>
          <span className="text-muted">Holding:</span>{" "}
          <span className="font-medium text-foreground">
            {usesLots
              ? `${formatNumber(curShares / lot, 0)} lots (${formatNumber(curShares, 0)} shares)`
              : `${formatNumber(curShares, 4)} shares`}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <Field label={`Target average price (${cur} per share)`}>
          <Input
            type="number"
            step="any"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 8500"
          />
        </Field>
        <Field label={`Buy price (${cur} per share)`}>
          <Input
            type="number"
            step="any"
            min="0"
            value={buy}
            onChange={(e) => setBuy(e.target.value)}
            placeholder="e.g. 7000"
          />
        </Field>
      </div>

      {result && "error" in result && (
        <p className="mt-4 text-sm text-muted">{result.error}</p>
      )}
      {result && !("error" in result) && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/5 p-4 text-sm">
          <div className="text-muted">You need to buy</div>
          <div className="mt-1 font-serif text-2xl text-foreground">
            {usesLots
              ? `${formatNumber(result.lots, 0)} lots`
              : `${formatNumber(result.shares, 4)} shares`}
          </div>
          {usesLots && (
            <div className="text-xs text-muted">
              {formatNumber(result.shares, 0)} shares
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-y-1.5">
            <span className="text-muted">Cash required</span>
            <span className="text-right tnum text-foreground">
              {formatNative(result.cost, cur)}
              <span className="text-muted"> · {formatUSD(result.cost * ratio)}</span>
            </span>
            <span className="text-muted">Resulting holding</span>
            <span className="text-right tnum text-foreground">
              {usesLots
                ? `${formatNumber(result.newShares / lot, 0)} lots`
                : `${formatNumber(result.newShares, 4)} shares`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
