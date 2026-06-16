"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Building2, LineChart, Coins, Bitcoin } from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { Card, Money } from "@/components/ui";
import { computeTotals, holdingPnlUsd } from "@/lib/calc";
import { AllocationDonut, ValueOverTime, SectorBreakdown, CLASS_COLORS } from "@/components/charts";
import { ASSET_CLASS_LABEL, AssetClass, Holding } from "@/lib/types";
import { formatPct, gainClass, formatDate } from "@/lib/format";
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

  if (loading) {
    return <div className="text-muted">Loading portfolio…</div>;
  }

  if (holdings.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Portfolio Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {currency === "IDR"
            ? `Valued in Rupiah · USD/IDR ≈ ${fxUsdIdr.toLocaleString("en-US")}`
            : "Valued in US Dollars"}
        </p>
        <div className="rule-gold mt-4 w-28" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Value">
          <Money usd={totals.totalValueUsd} className="font-serif text-2xl text-foreground" />
        </StatCard>
        <StatCard label="Total Invested">
          <Money usd={totals.totalCostUsd} className="font-serif text-2xl text-foreground" />
        </StatCard>
        <StatCard label="Unrealized P/L">
          <div className={`flex items-center gap-2 ${gainClass(totals.pnlUsd)}`}>
            {totals.pnlUsd >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <Money usd={totals.pnlUsd} className="font-serif text-2xl" />
          </div>
        </StatCard>
        <StatCard label="Return">
          <span className={`font-serif text-2xl ${gainClass(totals.pnlUsd)}`}>
            {formatPct(totals.pnlPct)}
          </span>
        </StatCard>
      </div>

      {/* Allocation + value over time */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-serif text-lg">Allocation</h2>
          <AllocationDonut byClass={totals.byClass} />
          <div className="mt-4 space-y-2">
            {(Object.keys(totals.byClass) as AssetClass[])
              .filter((k) => totals.byClass[k] > 0)
              .map((k) => {
                const Icon = CLASS_ICON[k];
                const pct = (totals.byClass[k] / totals.totalValueUsd) * 100;
                return (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CLASS_COLORS[k] }}
                      />
                      <Icon size={14} /> {ASSET_CLASS_LABEL[k]}
                    </span>
                    <span className="text-foreground">
                      <Money usd={totals.byClass[k]} compact /> · {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg">Value Over Time</h2>
            <span className="text-xs text-muted">
              {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
            </span>
          </div>
          <ValueOverTime data={series} />
        </Card>
      </div>

      {/* Sector + movers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-serif text-lg">Sector Breakdown</h2>
          <SectorBreakdown bySector={totals.bySector} />
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-lg">Top Movers</h2>
          {movers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No market holdings yet.
            </div>
          ) : (
            <div className="space-y-3">
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

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="py-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
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
      className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-2/50"
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
