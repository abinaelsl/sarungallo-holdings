"use client";

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Card, Money, Button, Input, Field } from "./ui";
import { usePortfolio } from "./PortfolioProvider";
import { Holding, Dividend } from "@/lib/types";
import {
  annualDividendNative,
  annualDividendUsd,
  dividendYieldOnCost,
  dividendYieldCurrent,
} from "@/lib/calc";
import { formatNumber, formatDate } from "@/lib/format";

export function DividendPanel({
  holding,
  dividends,
  onChange,
}: {
  holding: Holding;
  dividends: Dividend[];
  onChange: () => void;
}) {
  const { updateHolding, addDividend, deleteDividend } = usePortfolio();
  const cur = holding.currency || "USD";

  const [perShare, setPerShare] = useState(
    holding.annual_dividend_per_share != null
      ? String(holding.annual_dividend_per_share)
      : "",
  );
  const [savingProj, setSavingProj] = useState(false);

  const [adding, setAdding] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState(
    holding.quantity != null ? String(holding.quantity) : "",
  );
  const [savingPay, setSavingPay] = useState(false);

  const annualNative = annualDividendNative(holding);
  const annualUsd = annualDividendUsd(holding);
  const yoc = dividendYieldOnCost(holding);
  const cy = dividendYieldCurrent(holding);
  const totalReceived = dividends.reduce((s, d) => s + (d.total_usd ?? 0), 0);

  async function saveProjection() {
    setSavingProj(true);
    await updateHolding(holding.id, {
      annual_dividend_per_share: perShare ? Number(perShare) : null,
    } as Record<string, unknown>);
    setSavingProj(false);
  }

  async function addPayment() {
    if (!amount) return;
    setSavingPay(true);
    const ok = await addDividend(holding.id, {
      pay_date: payDate,
      amount_per_share: Number(amount),
      shares: shares ? Number(shares) : undefined,
      currency: cur,
    });
    setSavingPay(false);
    if (ok) {
      setAmount("");
      setAdding(false);
      onChange();
    }
  }

  async function removePayment(id: string) {
    const ok = await deleteDividend(id);
    if (ok) onChange();
  }

  return (
    <Card>
      <h2 className="mb-1 font-serif text-lg">Dividends</h2>
      <p className="mb-4 text-sm text-muted">
        Enter the annual dividend per share. Yield is calculated against your average
        purchase price.
      </p>

      {/* Projection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={`Annual dividend / share (${cur})`}>
          <div className="flex gap-2">
            <Input
              type="number"
              step="any"
              min="0"
              value={perShare}
              onChange={(e) => setPerShare(e.target.value)}
              placeholder="e.g. 200"
            />
            <Button variant="outline" onClick={saveProjection} disabled={savingProj}>
              <Save size={15} /> {savingProj ? "Saving…" : "Save"}
            </Button>
          </div>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Annual income">
          <Money usd={annualUsd} className="font-serif text-lg text-foreground" />
          {annualNative > 0 && (
            <div className="text-xs text-muted">
              {formatNumber(annualNative, 0)} {cur}
            </div>
          )}
        </Metric>
        <Metric label="Monthly">
          <Money usd={annualUsd / 12} className="font-serif text-lg text-foreground" />
        </Metric>
        <Metric label="Yield on cost">
          <span className="font-serif text-lg text-gold">
            {yoc != null ? `${yoc.toFixed(2)}%` : "—"}
          </span>
        </Metric>
        <Metric label="Current yield">
          <span className="font-serif text-lg text-foreground">
            {cy != null ? `${cy.toFixed(2)}%` : "—"}
          </span>
        </Metric>
      </div>

      {/* Payment log */}
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Payments received
          {totalReceived > 0 && (
            <span className="ml-2 text-muted">
              · <Money usd={totalReceived} /> total
            </span>
          )}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> Log payment
        </Button>
      </div>

      {adding && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2/50 p-3 sm:grid-cols-4">
          <Field label="Pay date">
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </Field>
          <Field label={`Amount / share (${cur})`}>
            <Input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Shares held">
            <Input
              type="number"
              step="any"
              min="0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button onClick={addPayment} disabled={savingPay} className="w-full">
              {savingPay ? "Saving…" : "Add"}
            </Button>
          </div>
        </div>
      )}

      {dividends.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 px-3 text-right font-medium">/ Share</th>
                <th className="py-2 px-3 text-right font-medium">Shares</th>
                <th className="py-2 px-3 text-right font-medium">Total</th>
                <th className="py-2 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-muted">{formatDate(d.pay_date)}</td>
                  <td className="py-2 px-3 text-right tnum">
                    {formatNumber(d.amount_per_share, 2)} {d.currency}
                  </td>
                  <td className="py-2 px-3 text-right tnum text-muted">
                    {formatNumber(d.shares, 0)}
                  </td>
                  <td className="py-2 px-3 text-right tnum text-foreground">
                    <Money usd={d.total_usd} />
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <button
                      onClick={() => removePayment(d.id)}
                      className="rounded-md p-1.5 text-muted hover:bg-loss/10 hover:text-loss cursor-pointer"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No payments logged yet.</p>
      )}
    </Card>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
