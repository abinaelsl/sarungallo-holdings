"use client";

import { useMemo, useState } from "react";
import { Card, SectionHeader, Field, Input, Skeleton } from "@/components/ui";
import { RetirementSubnav } from "@/components/retirement/RetirementSubnav";
import { CountUp, Rp } from "@/components/retirement/RetirementUi";
import { CashFlowBalanceChart } from "@/components/retirement/RetirementCharts";
import { useRetirementQuotes } from "@/components/retirement/useRetirementQuotes";
import {
  annualDividendFromHoldings,
  computeHoldings,
  simulateCashFlow,
  simulateCompoundSurplus,
} from "@/lib/retirement/calc";
import { DIGITAL_BANK_RATE, FAMILY_MEMBERS } from "@/lib/retirement/data";
import { formatPct2 } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function CashFlowPage() {
  const { quotes, ready } = useRetirementQuotes();

  // Default annual dividend = family core total (dad+mom+son spending pool ≈ all core)
  const defaultAnnual = useMemo(() => {
    return FAMILY_MEMBERS.reduce((s, m) => {
      const h = computeHoldings(m.portfolioCore, quotes);
      return s + annualDividendFromHoldings(h);
    }, 0);
  }, [quotes]);

  const [annualDiv, setAnnualDiv] = useState<number | null>(null);
  const [bankRate, setBankRate] = useState(DIGITAL_BANK_RATE * 100);
  const [manualWithdrawal, setManualWithdrawal] = useState(false);
  const [withdrawal, setWithdrawal] = useState(0);
  const [showCompound, setShowCompound] = useState(false);

  const effectiveAnnual = annualDiv ?? defaultAnnual;
  const effectiveWithdrawal = manualWithdrawal
    ? withdrawal
    : effectiveAnnual / 12;

  const sim = useMemo(
    () => simulateCashFlow(effectiveAnnual, bankRate, effectiveWithdrawal),
    [effectiveAnnual, bankRate, effectiveWithdrawal],
  );

  const compound = useMemo(
    () =>
      showCompound
        ? simulateCompoundSurplus(
            effectiveAnnual,
            bankRate,
            effectiveWithdrawal,
            5,
          )
        : [],
    [showCompound, effectiveAnnual, bankRate, effectiveWithdrawal],
  );

  const chartData = sim.months.map((m) => ({
    month: `M${m.month}`,
    balance: m.endBalance,
  }));

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">
          Dividend → digital bank → monthly draw
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">
          Cash Flow Engine
        </h1>
        <div className="rule-gold mt-3 w-28" />
      </div>

      <RetirementSubnav />

      {/* Inputs */}
      <Card accent className="fade-up">
        <SectionHeader title="Inputs" />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={`Annual dividend — ${formatRpShort(effectiveAnnual)}`}>
            <input
              type="range"
              min={50_000_000}
              max={800_000_000}
              step={1_000_000}
              value={effectiveAnnual}
              onChange={(e) => setAnnualDiv(Number(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
            <Input
              type="number"
              className="mt-2"
              value={Math.round(effectiveAnnual)}
              onChange={(e) => setAnnualDiv(Number(e.target.value))}
            />
          </Field>

          <Field label={`Bank rate — ${formatPct2(bankRate)}`}>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={bankRate}
              onChange={(e) => setBankRate(Number(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
            <Input
              type="number"
              className="mt-2"
              step={0.1}
              value={bankRate}
              onChange={(e) => setBankRate(Number(e.target.value))}
            />
          </Field>

          <Field
            label="Monthly withdrawal"
            hint={manualWithdrawal ? "Manual" : "Auto: annual ÷ 12"}
          >
            <label className="mb-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={manualWithdrawal}
                onChange={(e) => {
                  setManualWithdrawal(e.target.checked);
                  if (e.target.checked) setWithdrawal(effectiveAnnual / 12);
                }}
                className="accent-[var(--gold)]"
              />
              Override auto withdrawal
            </label>
            <Input
              type="number"
              disabled={!manualWithdrawal}
              value={Math.round(effectiveWithdrawal)}
              onChange={(e) => setWithdrawal(Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      {/* KPI outputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OutKpi label="Total float interest" tone="gain">
          <CountUp value={sim.totalInterest} className="font-serif text-xl text-gain" />
        </OutKpi>
        <OutKpi label="Net after 20% PPh bunga" tone="gain">
          <CountUp value={sim.netAfterTax} className="font-serif text-xl text-gain" />
        </OutKpi>
        <OutKpi label="Year-end surplus" tone="gold">
          <CountUp value={sim.yearEndSurplus} className="font-serif text-xl text-gold" />
        </OutKpi>
        <OutKpi label="Effective monthly boost" tone="gain">
          <CountUp
            value={sim.effectiveMonthlyBoost}
            className="font-serif text-xl text-gain"
          />
        </OutKpi>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="fade-up">
          <SectionHeader title="Balance Over 12 Months" />
          <CashFlowBalanceChart data={chartData} />
        </Card>

        <Card className="fade-up overflow-x-auto">
          <SectionHeader title="Month-by-Month" />
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="py-2 pr-2 font-medium">Mo</th>
                <th className="py-2 pr-2 font-medium">Start</th>
                <th className="py-2 pr-2 font-medium">Interest</th>
                <th className="py-2 pr-2 font-medium">Draw</th>
                <th className="py-2 font-medium">End</th>
              </tr>
            </thead>
            <tbody>
              {sim.months.map((m) => (
                <tr key={m.month} className="border-b border-border/50">
                  <td className="py-1.5 pr-2 tnum">{m.month}</td>
                  <td className="py-1.5 pr-2"><Rp value={m.startBalance} /></td>
                  <td className="py-1.5 pr-2 text-gain"><Rp value={m.interest} /></td>
                  <td className="py-1.5 pr-2"><Rp value={m.withdrawal} /></td>
                  <td className="py-1.5"><Rp value={m.endBalance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Advanced compound */}
      <Card>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showCompound}
            onChange={(e) => setShowCompound(e.target.checked)}
            className="accent-[var(--gold)]"
          />
          <div>
            <div className="text-sm font-medium text-foreground">
              Show compound effect
            </div>
            <div className="text-xs text-muted">
              Roll year-end surplus into next year&apos;s dividend pool (5 years)
            </div>
          </div>
        </label>

        {showCompound && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Year</th>
                  <th className="py-2 pr-3 font-medium">Starting pool</th>
                  <th className="py-2 pr-3 font-medium">Interest</th>
                  <th className="py-2 font-medium">Year-end surplus</th>
                </tr>
              </thead>
              <tbody>
                {compound.map((r) => (
                  <tr key={r.year} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 tnum">{r.year}</td>
                    <td className="py-1.5 pr-3"><Rp value={r.startingPool} /></td>
                    <td className="py-1.5 pr-3 text-gain"><Rp value={r.interest} /></td>
                    <td className="py-1.5 text-gold"><Rp value={r.surplus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatRpShort(v: number) {
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(0)}M`;
  return `Rp${Math.round(v).toLocaleString("id-ID")}`;
}

function OutKpi({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone: "gain" | "gold";
}) {
  return (
    <Card accent className="py-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1", tone === "gold" ? "text-gold" : "text-gain")}>
        {children}
      </div>
    </Card>
  );
}
