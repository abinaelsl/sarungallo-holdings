"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  PiggyBank,
  Percent,
  Wallet,
  TrendingUp,
  ChevronRight,
  Landmark,
} from "lucide-react";
import { Card, SectionHeader, Skeleton, Badge } from "@/components/ui";
import { RetirementSubnav } from "@/components/retirement/RetirementSubnav";
import { CountUp, Rp, StatusPill } from "@/components/retirement/RetirementUi";
import {
  GrowthProjectionChart,
  IncomeBySourceChart,
} from "@/components/retirement/RetirementCharts";
import { useRetirementQuotes } from "@/components/retirement/useRetirementQuotes";
import {
  familyTotals,
  growthChartData,
  incomeBySourceChart,
} from "@/lib/retirement/calc";
import { formatPct2 } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function RetirementDashboardPage() {
  const { quotes, ready } = useRetirementQuotes();

  const totals = useMemo(() => familyTotals(quotes), [quotes]);
  const sourceChart = useMemo(() => incomeBySourceChart(quotes), [quotes]);
  const growthChart = useMemo(() => growthChartData(quotes), [quotes]);

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">
          Himbara retirement · BMRI · BBRI · BBNI
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">
          Family Retirement
        </h1>
        <div className="rule-gold mt-3 w-28" />
        <p className="mt-3 max-w-2xl text-sm text-muted">
          100% Indonesian Himbara bank stocks across Dad, Mom, and Son — dividends
          fund living expenses, surplus floats at ~7%, miles stack on BCA KrisFlyer.
        </p>
      </div>

      <RetirementSubnav />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Family FUM"
          icon={PiggyBank}
          delay="60ms"
          tone="default"
        >
          <CountUp value={totals.totalFum} className="font-serif text-2xl text-foreground" />
        </KpiCard>
        <KpiCard
          label="Annual Dividends"
          icon={Wallet}
          delay="120ms"
          tone="gain"
        >
          <CountUp
            value={totals.totalAnnualDiv}
            className="font-serif text-2xl text-gain"
          />
        </KpiCard>
        <KpiCard
          label="Blended Yield"
          icon={Percent}
          delay="180ms"
          tone="gold"
        >
          <CountUp
            value={totals.blendedYield * 100}
            format="pct"
            className="font-serif text-2xl text-gold"
          />
        </KpiCard>
        <KpiCard
          label="Monthly Household"
          icon={TrendingUp}
          delay="240ms"
          tone="gain"
        >
          <CountUp
            value={totals.householdMonthly}
            className="font-serif text-2xl text-gain"
          />
        </KpiCard>
      </div>

      {/* Member cards */}
      <div>
        <SectionHeader title="Members" aside="Tap a card for full detail" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {totals.byMember.map(({ member, income }, i) => (
            <Link
              key={member.id}
              href={`/retirement/${member.id}`}
              className="block fade-up"
              style={{ animationDelay: `${280 + i * 60}ms` }}
            >
              <Card interactive accent className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-xl text-foreground">
                      {member.name}
                    </h3>
                    <div className="mt-1 text-xs text-muted">{member.broker}</div>
                  </div>
                  <StatusPill status={member.strategy} />
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Portfolio
                  </div>
                  <Rp
                    value={member.portfolioCore + member.portfolioSurplus}
                    className="font-serif text-2xl text-foreground"
                  />
                  {member.portfolioSurplus > 0 && (
                    <div className="mt-0.5 text-xs text-muted">
                      Core <Rp value={member.portfolioCore} /> · Surplus{" "}
                      <Rp value={member.portfolioSurplus} />
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted">Monthly dividends</div>
                    <Rp
                      value={income.monthlyDividend}
                      className="text-sm font-medium text-gain"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted">All-source / mo</div>
                    <Rp
                      value={
                        member.strategy === "reinvesting"
                          ? income.monthlyPerks
                          : income.monthlyAllSource
                      }
                      className="text-sm font-medium text-foreground"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {member.prioritas.map((p) => (
                    <Badge key={p} className="gap-1">
                      <Landmark size={12} /> {p} Prioritas
                    </Badge>
                  ))}
                  <span className="ml-auto flex items-center gap-1 text-xs text-gold">
                    Detail <ChevronRight size={14} />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="fade-up" style={{ animationDelay: "480ms" }}>
          <SectionHeader
            title="Monthly Income by Source"
            aside="Stacked · IDR"
          />
          <IncomeBySourceChart data={sourceChart} />
        </Card>
        <Card className="fade-up" style={{ animationDelay: "520ms" }}>
          <SectionHeader
            title="Projected Growth"
            aside={`@ ${formatPct2(totals.blendedYield * 100)} compound`}
          />
          <GrowthProjectionChart data={growthChart} />
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  icon: Icon,
  children,
  delay,
  tone,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: string;
  tone: "default" | "gain" | "gold";
}) {
  return (
    <Card
      accent
      interactive
      className="fade-up py-4"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
        <Icon
          size={16}
          className={cn(
            tone === "gain" && "text-gain/80",
            tone === "gold" && "text-gold",
            tone === "default" && "text-gold/70",
          )}
        />
      </div>
      <div className="mt-1.5">{children}</div>
    </Card>
  );
}
