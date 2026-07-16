"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  FileText,
  Pencil,
  Landmark,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Card, SectionHeader, Skeleton, Button, Input, Field, Badge } from "@/components/ui";
import { RetirementSubnav } from "@/components/retirement/RetirementSubnav";
import { Rp, StatusPill } from "@/components/retirement/RetirementUi";
import { useRetirementQuotes } from "@/components/retirement/useRetirementQuotes";
import {
  annualDividendFromHoldings,
  blendedYield,
  computeHoldings,
  getMember,
  holdingYield,
  incomeWaterfall,
  memberIncome,
  simulateCashFlow,
} from "@/lib/retirement/calc";
import type { MemberId, Ticker } from "@/lib/retirement/types";
import { formatNumber, formatPct2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DIGITAL_BANK_RATE } from "@/lib/retirement/data";

export default function MemberDetailClient({ memberId }: { memberId: MemberId }) {
  const member = getMember(memberId);
  if (!member) {
    notFound();
  }

  const { quotes, ready, updateQuote, resetQuotes } = useRetirementQuotes();
  const [editing, setEditing] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const [bankRate, setBankRate] = useState(DIGITAL_BANK_RATE * 100);
  const [withdrawalOverride, setWithdrawalOverride] = useState<string>("");

  const holdings = useMemo(
    () => computeHoldings(member.portfolioCore, quotes),
    [member.portfolioCore, quotes],
  );
  const income = useMemo(() => memberIncome(member, quotes), [member, quotes]);
  const waterfall = useMemo(() => incomeWaterfall(member, quotes), [member, quotes]);
  const yieldRate = useMemo(() => blendedYield(quotes), [quotes]);

  const annualDiv = annualDividendFromHoldings(holdings);
  const monthlyDefault = annualDiv / 12;
  const withdrawal =
    withdrawalOverride.trim() && !Number.isNaN(Number(withdrawalOverride))
      ? Number(withdrawalOverride)
      : monthlyDefault;
  const sim = useMemo(
    () => simulateCashFlow(annualDiv, bankRate, withdrawal),
    [annualDiv, bankRate, withdrawal],
  );

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <Link
          href="/retirement"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={14} /> Family dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-foreground">{member.name}</h1>
            <div className="rule-gold mt-3 w-20" />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{member.broker}</span>
              {member.prioritas.map((p) => (
                <Badge key={p} className="gap-1">
                  <Landmark size={12} /> {p} Prioritas
                </Badge>
              ))}
              <StatusPill status={member.strategy} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted">Portfolio</div>
            <Rp
              value={member.portfolioCore + member.portfolioSurplus}
              className="font-serif text-2xl text-foreground"
            />
            <div className="mt-1 text-sm text-gain">
              <Rp value={income.monthlyAllSource} /> / mo all-source
            </div>
          </div>
        </div>
      </div>

      <RetirementSubnav />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={editing ? "primary" : "outline"}
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil size={14} /> {editing ? "Done editing" : "Edit holdings"}
        </Button>
        <Button
          variant={showSim ? "primary" : "outline"}
          size="sm"
          onClick={() => setShowSim((v) => !v)}
        >
          <Calculator size={14} /> Simulate cash flow
        </Button>
        <Link href="/retirement/tax">
          <Button variant="outline" size="sm">
            <FileText size={14} /> View tax status
          </Button>
        </Link>
        {editing && (
          <Button variant="ghost" size="sm" onClick={resetQuotes}>
            Reset prices
          </Button>
        )}
      </div>

      {/* Holdings */}
      <Card className="fade-up overflow-x-auto p-0" style={{ animationDelay: "80ms" }}>
        <div className="border-b border-border px-5 py-4">
          <SectionHeader
            title="Holdings"
            aside={`Blended yield ${formatPct2(yieldRate * 100)}`}
            className="mb-0"
          />
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Ticker</th>
              <th className="px-3 py-3 font-medium">Weight</th>
              <th className="px-3 py-3 font-medium">Capital</th>
              <th className="px-3 py-3 font-medium">Price</th>
              <th className="px-3 py-3 font-medium">Shares</th>
              <th className="px-3 py-3 font-medium">DPS</th>
              <th className="px-3 py-3 font-medium">Annual Div</th>
              <th className="px-3 py-3 font-medium">Yield</th>
              <th className="px-5 py-3 font-medium">P/E</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.ticker} className="border-b border-border/70 last:border-0">
                <td className="px-5 py-3">
                  <div className="font-medium text-foreground">{h.ticker}</div>
                  <div className="text-xs text-muted">{h.name}</div>
                </td>
                <td className="px-3 py-3 tnum">{h.weightPct}%</td>
                <td className="px-3 py-3">
                  <Rp value={h.capital} />
                </td>
                <td className="px-3 py-3">
                  {editing ? (
                    <Input
                      type="number"
                      className="w-28"
                      value={h.price}
                      onChange={(e) => {
                        const price = Number(e.target.value);
                        if (!price || price <= 0) return;
                        const y = holdingYield(
                          quotes.find((q) => q.ticker === h.ticker)!,
                        );
                        // Preserve yield when price edits: recompute DPS = price × yield
                        updateQuote(h.ticker as Ticker, {
                          price,
                          dps: price * y,
                        });
                      }}
                    />
                  ) : (
                    <Rp value={h.price} />
                  )}
                </td>
                <td className="px-3 py-3 tnum">
                  {formatNumber(h.shares, 0)}
                </td>
                <td className="px-3 py-3">
                  <Rp value={h.dps} />
                </td>
                <td className="px-3 py-3 text-gain">
                  <Rp value={h.annualDividend} />
                </td>
                <td className="px-3 py-3 text-gold tnum">
                  {formatPct2(h.dividendYield * 100)}
                </td>
                <td className="px-5 py-3">
                  {editing ? (
                    <Input
                      type="number"
                      step="0.1"
                      className="w-20"
                      value={h.peRatio}
                      onChange={(e) =>
                        updateQuote(h.ticker as Ticker, {
                          peRatio: Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <span className="tnum">{h.peRatio.toFixed(1)}</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-surface-2/40 font-medium">
              <td className="px-5 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-3 py-3">
                <Rp value={member.portfolioCore} />
              </td>
              <td className="px-3 py-3" colSpan={3} />
              <td className="px-3 py-3 text-gain">
                <Rp value={annualDiv} />
              </td>
              <td className="px-3 py-3 text-gold tnum">
                {formatPct2(yieldRate * 100)}
              </td>
              <td className="px-5 py-3" />
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Income stack */}
      <Card className="fade-up" style={{ animationDelay: "140ms" }}>
        <SectionHeader title="Income Stack" aside="Gross dividend → monthly take-home" />
        <div className="space-y-2">
          {waterfall.map((step, i) => (
            <div
              key={step.step}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5",
                step.kind === "net" && "border border-gold/30 bg-gold-tint/30",
                step.kind === "gross" && "bg-surface-2/50",
                step.kind === "add" && "border-l-2 border-gain/50",
              )}
              style={{ animationDelay: `${160 + i * 40}ms` }}
            >
              <span
                className={cn(
                  "text-sm",
                  step.kind === "net" ? "font-medium text-foreground" : "text-muted",
                )}
              >
                {step.step}
              </span>
              <Rp
                value={step.value}
                className={cn(
                  "text-sm font-medium",
                  step.kind === "add" && "text-gain",
                  step.kind === "net" && "text-gold",
                  step.kind === "gross" && "text-foreground",
                )}
              />
            </div>
          ))}
        </div>
        {member.strategy === "reinvesting" && (
          <p className="mt-3 text-xs text-muted">
            Son reinvests 100% of dividends — take-home from dividends is Rp0; perks
            and soft benefits still accrue.
          </p>
        )}
      </Card>

      {/* Inline cash flow sim */}
      {showSim && (
        <Card className="fade-up">
          <SectionHeader
            title="Cash Flow Simulator"
            aside={
              <Link href="/retirement/cashflow" className="text-gold hover:underline">
                Open full engine →
              </Link>
            }
          />
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Field label="Digital bank rate (%)">
              <Input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={bankRate}
                onChange={(e) => setBankRate(Number(e.target.value))}
              />
            </Field>
            <Field label="Monthly withdrawal (IDR)" hint="Blank = annual dividend ÷ 12">
              <Input
                type="number"
                placeholder={String(Math.round(monthlyDefault))}
                value={withdrawalOverride}
                onChange={(e) => setWithdrawalOverride(e.target.value)}
              />
            </Field>
            <div className="rounded-lg border border-border bg-surface-2/40 p-3">
              <div className="text-xs text-muted">Year-end surplus</div>
              <Rp value={sim.yearEndSurplus} className="font-serif text-xl text-gold" />
              <div className="mt-1 text-xs text-gain">
                Float interest <Rp value={sim.totalInterest} />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Mo</th>
                  <th className="py-2 pr-3 font-medium">Start</th>
                  <th className="py-2 pr-3 font-medium">Interest</th>
                  <th className="py-2 pr-3 font-medium">Withdrawal</th>
                  <th className="py-2 font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                {sim.months.map((m) => (
                  <tr key={m.month} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 tnum">{m.month}</td>
                    <td className="py-1.5 pr-3"><Rp value={m.startBalance} /></td>
                    <td className="py-1.5 pr-3 text-gain"><Rp value={m.interest} /></td>
                    <td className="py-1.5 pr-3"><Rp value={m.withdrawal} /></td>
                    <td className="py-1.5"><Rp value={m.endBalance} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
