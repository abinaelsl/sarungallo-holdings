"use client";

import { useMemo, useState } from "react";
import { Card, SectionHeader, Field, Input, Skeleton } from "@/components/ui";
import { RetirementSubnav } from "@/components/retirement/RetirementSubnav";
import { CountUp, Rp } from "@/components/retirement/RetirementUi";
import { MilesCumulativeChart } from "@/components/retirement/RetirementCharts";
import { useRetirementQuotes } from "@/components/retirement/useRetirementQuotes";
import {
  annualDividendFromHoldings,
  ccFloatInterest,
  computeHoldings,
  krisFlyerMiles,
} from "@/lib/retirement/calc";
import {
  DIGITAL_BANK_RATE,
  FAMILY_MEMBERS,
  MILE_VALUE_HIGH,
  MILE_VALUE_LOW,
  MILES_PER_RP,
} from "@/lib/retirement/data";
import { formatNumber } from "@/lib/format";

export default function MilesPage() {
  const { quotes, ready } = useRetirementQuotes();

  const defaultMonthly = useMemo(() => {
    // Default spend ≈ family annual dividend / 12 (spenders' pipeline)
    const annual = FAMILY_MEMBERS.filter((m) => m.strategy === "spending").reduce(
      (s, m) => s + annualDividendFromHoldings(computeHoldings(m.portfolioCore, quotes)),
      0,
    );
    return annual / 12;
  }, [quotes]);

  const [monthlySpend, setMonthlySpend] = useState<number | null>(null);
  const [mileLow, setMileLow] = useState(MILE_VALUE_LOW);
  const [mileHigh, setMileHigh] = useState(MILE_VALUE_HIGH);
  const [bankRate, setBankRate] = useState(DIGITAL_BANK_RATE * 100);

  const spend = monthlySpend ?? defaultMonthly;
  const annualSpend = spend * 12;
  const miles = krisFlyerMiles(annualSpend, mileLow, mileHigh);
  const floatAnnual = ccFloatInterest(spend, bankRate / 100);

  const cumulative = useMemo(() => {
    const monthlyMiles = spend / MILES_PER_RP;
    return Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      miles: Math.round(monthlyMiles * (i + 1)),
    }));
  }, [spend]);

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">
          BCA KrisFlyer Visa Signature
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">Miles Tracker</h1>
        <div className="rule-gold mt-3 w-28" />
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Earn rate locked at 1 mile / Rp10.000. Mile value editable (Rp150–200
          typical). CC float assumes ~45 days outstanding before auto-debit.
        </p>
      </div>

      <RetirementSubnav />

      <Card accent className="fade-up">
        <SectionHeader title="Inputs" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Monthly CC spend (IDR)">
            <input
              type="range"
              min={5_000_000}
              max={80_000_000}
              step={500_000}
              value={spend}
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
              className="mb-2 w-full accent-[var(--gold)]"
            />
            <Input
              type="number"
              value={Math.round(spend)}
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
            />
          </Field>
          <Field label="Earn rate" hint="Read-only">
            <Input readOnly value={`1 mile / Rp${MILES_PER_RP.toLocaleString("id-ID")}`} />
          </Field>
          <Field label="Mile value low (Rp)">
            <Input
              type="number"
              value={mileLow}
              onChange={(e) => setMileLow(Number(e.target.value))}
            />
          </Field>
          <Field label="Mile value high (Rp)">
            <Input
              type="number"
              value={mileHigh}
              onChange={(e) => setMileHigh(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="mt-4 max-w-xs">
          <Field label="Bank rate for CC float (%)">
            <Input
              type="number"
              step={0.1}
              value={bankRate}
              onChange={(e) => setBankRate(Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card accent className="py-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Annual miles
          </div>
          <CountUp
            value={miles.annualMiles}
            format="number"
            className="mt-1 font-serif text-2xl text-foreground"
          />
        </Card>
        <Card accent className="py-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Value (low)
          </div>
          <CountUp
            value={miles.rupiahLow}
            className="mt-1 font-serif text-2xl text-gain"
          />
        </Card>
        <Card accent className="py-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Value (high)
          </div>
          <CountUp
            value={miles.rupiahHigh}
            className="mt-1 font-serif text-2xl text-gain"
          />
        </Card>
        <Card accent className="py-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            CC float interest / yr
          </div>
          <CountUp
            value={floatAnnual}
            className="mt-1 font-serif text-2xl text-gold"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="fade-up">
          <SectionHeader title="Cumulative Miles (12 mo)" />
          <MilesCumulativeChart data={cumulative} />
        </Card>
        <Card className="fade-up">
          <SectionHeader title="How it computes" />
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Annual spend</dt>
              <dd>
                <Rp value={annualSpend} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Annual miles</dt>
              <dd className="tnum">
                {formatNumber(miles.annualMiles, 0)} = spend ÷ {MILES_PER_RP.toLocaleString("id-ID")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Rupiah value</dt>
              <dd className="tnum text-gain">
                miles × Rp{mileLow}–{mileHigh}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Avg outstanding</dt>
              <dd>
                <Rp value={spend * (45 / 30)} />
                <span className="text-muted"> (× 45/30)</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Float interest</dt>
              <dd className="text-gold">
                <Rp value={floatAnnual} />
                <span className="text-muted"> / year</span>
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
