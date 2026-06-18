"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  LineChart,
  Coins,
  Bitcoin,
  Wallet,
  Percent,
} from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { Card, Money, SectionHeader, Skeleton } from "@/components/ui";
import { computeTotals, holdingPnlUsd } from "@/lib/calc";
import {
  AllocationDonut,
  ValueOverTime,
  SectorBreakdown,
  Sparkline,
  CLASS_COLORS,
} from "@/components/charts";
import { ASSET_CLASS_LABEL, AssetClass, Holding } from "@/lib/types";
import { formatPct, gainClass, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import Link from "next/link";

const CLASS_ICON: Record<AssetClass, React.ElementType> = {
  real_estate: Building2,
  equity: LineChart,
  gold: Coins,
  crypto: Bitcoin,
};

export default function DashboardPage() {
  const { holdings, snapshots, loading, currency, fxUsdIdr } = usePortfolio();

  const totals = useMemo(() => computeTotals(holdings), [holdings]);

  const series = useMemo(() => {
    return snapshots.map((s) => ({
      t: new Date(s.captured_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: Number(s.total_value_usd),
      cost: Number(s.total_cost_usd),
    }));
  }, [snapshots]);

  const movers = useMemo(() => {
    return [...holdings]
      .filter((h) => h.asset_class !== "real_estate")
      .map((h) => ({ h, pnl: holdingPnlUsd(h) }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 5);
  }, [holdings]);

  const lastSnap = snapshots.length
    ? snapshots[snapshots.length - 1].captured_at
    : null;

  if (loading) return <DashboardSkeleton />;

  if (holdings.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center animate-fade-in">
        <h1 className="font-serif text-2xl text-foreground">Welcome</h1>
        <p className="mt-2 text-muted">
          Your portfolio is empty. Add your first holding to begin tracking.
        </p>
        <Link
          href="/holdings"
          className="mt-6 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[#1c1a18] hover:bg-gold-soft"
        >
          Add holdings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">
          Private family office
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">Portfolio Overview</h1>
        <div className="rule-gold mt-3 w-28" />
      </div>

      {/* Hero value band */}
      <Card accent className="fade-up overflow-hidden p-0" style={{ animationDelay: "60ms" }}>
        <div className="grid sm:grid-cols-[1.5fr_1fr]">
          <div className="p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">
              Total Portfolio Value
            </div>
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <Money
                usd={totals.totalValueUsd}
                className="hero-figure font-serif text-4xl text-foreground sm:text-5xl"
              />
              <ReturnChip pnl={totals.pnlUsd} pct={totals.pnlPct} />
            </div>
            <div className="mt-3 text-sm text-muted">
              Invested <Money usd={totals.totalCostUsd} className="text-ink-soft" />
              {" · "}
              {currency === "IDR"
                ? `USD/IDR ≈ ${fxUsdIdr.toLocaleString("en-US")}`
                : "Valued in US Dollars"}
              {lastSnap ? ` · as of ${formatDate(lastSnap)}` : ""}
            </div>
          </div>
          <div className="border-t border-border p-2 sm:border-l sm:border-t-0">
            <div className="h-full min-h-[128px] w-full">
              <Sparkline data={series} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Invested" icon={Wallet} delay="120ms">
          <Money usd={totals.totalCostUsd} className="font-serif text-2xl text-foreground" />
        </StatCard>
        <StatCard label="Unrealized P/L" icon={totals.pnlUsd >= 0 ? TrendingUp : TrendingDown} delay="180ms">
          <span className={cn("font-serif text-2xl", gainClass(totals.pnlUsd))}>
            <Money usd={totals.pnlUsd} />
          </span>
        </StatCard>
        <StatCard label="Return" icon={Percent} delay="240ms">
          <span className={cn("font-serif text-2xl", gainClass(totals.pnlUsd))}>
            {formatPct(totals.pnlPct)}
          </span>
        </StatCard>
      </div>

      {/* Allocation + value over time */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="fade-up lg:col-span-1" style={{ animationDelay: "300ms" }}>
          <SectionHeader title="Allocation" />
          <AllocationDonut byClass={totals.byClass} />
          <div className="mt-4 space-y-1">
            {(Object.keys(totals.byClass) as AssetClass[])
              .filter((k) => totals.byClass[k] > 0)
              .map((k) => {
                const Icon = CLASS_ICON[k];
                const pct = (totals.byClass[k] / totals.totalValueUsd) * 100;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-2/50"
                  >
                    <span className="flex items-center gap-2 text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CLASS_COLORS[k] }}
                      />
                      <Icon size={14} /> {ASSET_CLASS_LABEL[k]}
                    </span>
                    <span className="text-foreground">
                      <Money usd={totals.byClass[k]} compact /> ·{" "}
                      <span className="text-muted">{pct.toFixed(1)}%</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card className="fade-up lg:col-span-2" style={{ animationDelay: "340ms" }}>
          <SectionHeader
            title="Value Over Time"
            aside={`${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"}`}
          />
          <ValueOverTime data={series} />
        </Card>
      </div>

      {/* Sector + movers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="fade-up" style={{ animationDelay: "400ms" }}>
          <SectionHeader title="Sector Breakdown" />
          <SectorBreakdown bySector={totals.bySector} />
        </Card>

        <Card className="fade-up" style={{ animationDelay: "440ms" }}>
          <SectionHeader title="Top Movers" />
          {movers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No market holdings yet.
            </div>
          ) : (
            <div className="space-y-1">
              {movers.map(({ h, pnl }) => (
                <MoverRow key={h.id} h={h} pnl={pnl} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReturnChip({ pnl, pct }: { pnl: number; pct: number | null }) {
  const up = pnl >= 0;
  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium",
        up
          ? "border-gain/30 bg-gain/10 text-gain"
          : "border-loss/30 bg-loss/10 text-loss",
      )}
    >
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {formatPct(pct)}
    </span>
  );
}

function StatCard({
  label,
  icon: Icon,
  children,
  delay,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  delay?: string;
}) {
  return (
    <Card accent interactive className="fade-up py-4" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
        {Icon && <Icon size={16} className="text-gold/70" />}
      </div>
      <div className="mt-1.5">{children}</div>
    </Card>
  );
}

function MoverRow({ h, pnl }: { h: Holding; pnl: number }) {
  const cost = h.cost_basis_usd || 0;
  const pct = cost ? (pnl / cost) * 100 : null;
  return (
    <Link
      href={`/holdings/${h.id}`}
      className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60"
    >
      <div>
        <div className="text-sm font-medium text-foreground">{h.name}</div>
        <div className="text-xs text-muted">
          {h.ticker} {h.price_updated_at ? `· ${formatDate(h.price_updated_at)}` : ""}
        </div>
      </div>
      <div className={`text-right text-sm ${gainClass(pnl)}`}>
        <div><Money usd={pnl} /></div>
        <div className="text-xs">{formatPct(pct)}</div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-8 w-56" />
      </div>
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-1" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    </div>
  );
}
