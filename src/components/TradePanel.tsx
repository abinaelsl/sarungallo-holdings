"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, TrendingDown } from "lucide-react";
import { Button, Field, Input } from "./ui";
import { Holding, TxnType } from "@/lib/types";
import { usePortfolio } from "./PortfolioProvider";
import { lotSize, usdPerNative } from "@/lib/calc";
import { formatNative, formatNumber, formatUSD } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TradePanel({
  holding,
  type,
  onDone,
}: {
  holding: Holding;
  type: TxnType;
  onDone?: () => void;
}) {
  const { addTransaction } = usePortfolio();
  const cur = holding.currency || "USD";
  const lot = lotSize(holding);
  const usesLots = lot > 1;
  const unitLabel = usesLots ? "lots" : "shares";

  const [price, setPrice] = useState("");
  const [units, setUnits] = useState(""); // lots or shares depending on market
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratio = usdPerNative(holding);
  const isBuy = type === "buy";

  const preview = useMemo(() => {
    const p = parseFloat(price);
    const u = parseFloat(units);
    if (!Number.isFinite(p) || p < 0 || !Number.isFinite(u) || u <= 0) return null;
    const shares = u * lot;
    const q = holding.quantity ?? 0;
    const avgNat = holding.avg_cost_native ?? p;

    if (isBuy) {
      const newQty = q + shares;
      const newCostNative = q * avgNat + shares * p;
      return {
        cashNative: shares * p,
        newQty,
        newAvg: newQty > 0 ? newCostNative / newQty : 0,
        realizedNative: null as number | null,
      };
    }
    if (shares > q) {
      return { error: `Only ${usesLots ? formatNumber(q / lot, 0) + " lots" : formatNumber(q, 4) + " shares"} available to sell.` };
    }
    return {
      cashNative: shares * p,
      newQty: q - shares,
      newAvg: avgNat,
      realizedNative: shares * (p - avgNat),
    };
  }, [price, units, lot, holding, isBuy, usesLots]);

  async function submit() {
    setError(null);
    const p = parseFloat(price);
    const u = parseFloat(units);
    if (!Number.isFinite(p) || p < 0) return setError("Enter a price per share.");
    if (!Number.isFinite(u) || u <= 0) return setError(`Enter the ${unitLabel} to ${type}.`);
    const shares = u * lot;
    if (!isBuy && shares > (holding.quantity ?? 0) + 1e-9) {
      return setError(
        `Cannot sell more than you hold (${usesLots ? formatNumber((holding.quantity ?? 0) / lot, 0) + " lots" : formatNumber(holding.quantity ?? 0, 4) + " shares"}).`,
      );
    }
    setSaving(true);
    const ok = await addTransaction(holding.id, {
      type,
      trade_date: date,
      shares,
      price_native: p,
      currency: cur,
    });
    setSaving(false);
    if (ok) {
      setPrice("");
      setUnits("");
      onDone?.();
    } else {
      setError("Could not save. Please try again.");
    }
  }

  return (
    <div className="max-w-md">
      <h3 className="font-serif text-lg text-foreground">
        {isBuy ? "Add to Position" : "Reduce Position"}
      </h3>
      <p className="mt-1 mb-4 text-sm text-muted">
        The new average buy price will be calculated automatically.
      </p>

      <div className="space-y-4">
        <Field label={`${isBuy ? "Buy" : "Sell"} price (${cur} per share)`}>
          <Input
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={
              holding.current_price_native != null
                ? String(holding.current_price_native)
                : usesLots
                ? "e.g. 9800"
                : "e.g. 150"
            }
          />
        </Field>
        <Field
          label={`${unitLabel} to ${type}`.toUpperCase()}
          hint={usesLots ? "1 lot = 100 shares" : undefined}
        >
          <Input
            type="number"
            step={usesLots ? "1" : "any"}
            min="0"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder={usesLots ? "e.g. 10 lots" : "e.g. 5 shares"}
          />
        </Field>
        <Field label="Transaction date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {preview && "error" in preview && (
          <p className="text-sm text-loss">{preview.error}</p>
        )}
        {preview && !("error" in preview) && (
          <div className="rounded-lg border border-border bg-surface-2/60 p-4">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted">{isBuy ? "Cash invested" : "Proceeds"}</span>
              <span className="text-right tnum text-foreground">
                {formatNative(preview.cashNative, cur)}
                <span className="text-muted"> · {formatUSD(preview.cashNative * ratio)}</span>
              </span>
              <span className="text-muted">New holding</span>
              <span className="text-right tnum text-foreground">
                {usesLots
                  ? `${formatNumber(preview.newQty / lot, 0)} lots`
                  : `${formatNumber(preview.newQty, 4)} shares`}
              </span>
              <span className="text-muted">New average</span>
              <span className="text-right tnum text-foreground">
                {formatNative(preview.newAvg, cur)}
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
                    {formatNative(preview.realizedNative, cur)}
                    <span className="opacity-70">
                      {" "}· {formatUSD(preview.realizedNative * ratio)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-sm text-loss">{error}</div>}

        <Button
          onClick={submit}
          disabled={saving}
          variant={isBuy ? "primary" : "danger"}
          className="w-full"
        >
          {isBuy ? <ShoppingCart size={16} /> : <TrendingDown size={16} />}
          {saving ? "Saving…" : isBuy ? "Confirm Purchase" : "Confirm Sale"}
        </Button>
      </div>
    </div>
  );
}
