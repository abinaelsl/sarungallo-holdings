"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, ArrowLeftRight, CalendarRange } from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { Card, SectionHeader, Skeleton } from "@/components/ui";
import { MonthlyPerformance, FxRateChart, type MonthPoint } from "@/components/charts";
import { Snapshot } from "@/lib/types";
import { formatUSD, formatIDR, formatPct, formatDate, gainClass } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Collapse raw snapshots into one point per calendar month (month-end). */
function toMonthly(snaps: Snapshot[]): (MonthPoint & { capturedAt: string })[] {
  const byMonth = new Map<string, Snapshot>();
  for (const s of snaps) {
    const d = new Date(s.captured_at);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(ym, s); // snapshots arrive ascending → keeps the last of each month
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, s]) => {
      const d = new Date(s.captured_at);
      const label = `${d.toLocaleDateString("en-US", { month: "short" })} '${String(
        d.getFullYear(),
      ).slice(2)}`;
      return {
        label,
        valueUsd: Number(s.total_value_usd),
        costUsd: Number(s.total_cost_usd),
        valueIdr: Number(s.total_value_idr),
        fx: Number(s.fx_usd_idr) || 0,
        capturedAt: s.captured_at,
      };
    });
}

export default function HistoryPage() {
  const { snapshots, loading, currency } = usePortfolio();
  const monthly = useMemo(() => toMonthly(snapshots), [snapshots]);

  if (loading) return <HistorySkeleton />;

  if (snapshots.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="py-16 text-center text-sm text-muted">
          No history captured yet. Hit{" "}
          <span className="font-medium text-foreground">Refresh</span> on the dashboard to
          save your first snapshot — each refresh adds a point to these trends.
        </Card>
      </div>
    );
  }

  const isUsd = currency === "USD";
  const first = monthly[0];
  const last = monthly[monthly.length - 1];

  const dispVal = (m: typeof first) => (isUsd ? m.valueUsd : m.valueIdr);
  const fmtDisp = (v: number) => (isUsd ? formatUSD(v) : formatIDR(v));

  const firstVal = first ? dispVal(first) : 0;
  const lastVal = last ? dispVal(last) : 0;
  const valChange = lastVal - firstVal;
  const valChangePct = firstVal ? (valChange / firstVal) * 100 : null;

  const fxFirst = first?.fx ?? 0;
  const fxLast = last?.fx ?? 0;
  const fxChangePct = fxFirst ? ((fxLast - fxFirst) / fxFirst) * 100 : null;

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Tracked since" icon={CalendarRange}>
          <div className="font-serif text-xl text-foreground">
            {first ? formatDate(first.capturedAt) : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"} ·{" "}
            {monthly.length} month{monthly.length === 1 ? "" : "s"}
          </div>
        </Stat>

        <Stat label={`Value change (${currency})`} icon={valChange >= 0 ? TrendingUp : TrendingDown}>
          <div className={cn("font-serif text-xl", gainClass(valChange))}>
            {valChange >= 0 ? "+" : "−"}
            {fmtDisp(Math.abs(valChange))}
          </div>
          <div className={cn("mt-0.5 text-xs", gainClass(valChange))}>
            {formatPct(valChangePct)} since {first ? first.label : "—"}
          </div>
        </Stat>

        <Stat label="USD / IDR" icon={ArrowLeftRight}>
          <div className="font-serif text-xl text-foreground tnum">
            Rp {fxLast ? Math.round(fxLast).toLocaleString("en-US") : "—"}
          </div>
          <div className={cn("mt-0.5 text-xs", gainClass(fxChangePct))}>
            {formatPct(fxChangePct)} over period
          </div>
        </Stat>
      </div>

      {/* Monthly performance combo */}
      <Card>
        <SectionHeader
          title="Monthly Performance"
          aside={`Value vs. invested · ${currency}`}
        />
        <MonthlyPerformance data={monthly} />
      </Card>

      {/* FX factor */}
      <Card>
        <SectionHeader title="USD / IDR Exchange Rate" aside="Rupiah per 1 USD" />
        <FxRateChart data={monthly.map((m) => ({ label: m.label, fx: m.fx }))} />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Your portfolio is priced in USD, so the rupiah value of the fund moves with both
          performance <span className="text-foreground">and</span> this exchange rate. When the
          rupiah weakens (rate rises), the IDR value gets a tailwind even if USD value is flat.
        </p>
      </Card>

      {/* Monthly breakdown table */}
      <Card className="overflow-hidden p-0">
        <div className="px-5 pt-5">
          <SectionHeader title="Monthly Breakdown" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Month</th>
                <th className="px-3 py-3 text-right font-medium">Value</th>
                <th className="px-3 py-3 text-right font-medium">Invested</th>
                <th className="px-3 py-3 text-right font-medium">P/L</th>
                <th className="px-5 py-3 text-right font-medium">USD/IDR</th>
              </tr>
            </thead>
            <tbody>
              {[...monthly].reverse().map((m) => {
                const value = dispVal(m);
                const cost = isUsd ? m.costUsd : m.costUsd * m.fx;
                const pnl = value - cost;
                return (
                  <tr
                    key={m.capturedAt}
                    className="border-b border-border/60 last:border-0 hover:bg-surface-2/40"
                  >
                    <td className="px-5 py-3 text-foreground">{m.label}</td>
                    <td className="px-3 py-3 text-right tnum text-foreground">{fmtDisp(value)}</td>
                    <td className="px-3 py-3 text-right tnum text-muted">{fmtDisp(cost)}</td>
                    <td className={cn("px-3 py-3 text-right tnum", gainClass(pnl))}>
                      {pnl >= 0 ? "+" : "−"}
                      {fmtDisp(Math.abs(pnl))}
                    </td>
                    <td className="px-5 py-3 text-right tnum text-muted">
                      {m.fx ? `Rp ${Math.round(m.fx).toLocaleString("en-US")}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="fade-up">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">Trends</div>
      <h1 className="mt-1 font-serif text-3xl text-foreground">History</h1>
      <div className="rule-gold mt-3 w-20" />
    </div>
  );
}

function Stat({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card accent interactive className="py-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
        <Icon size={16} className="text-gold/70" />
      </div>
      <div className="mt-1.5">{children}</div>
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
