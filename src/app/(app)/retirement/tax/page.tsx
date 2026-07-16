"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Check, AlertTriangle, X, Gift } from "lucide-react";
import { Card, SectionHeader, Skeleton, Badge } from "@/components/ui";
import { RetirementSubnav } from "@/components/retirement/RetirementSubnav";
import { Rp, StatusPill } from "@/components/retirement/RetirementUi";
import { useRetirementQuotes } from "@/components/retirement/useRetirementQuotes";
import {
  annualDividendFromHoldings,
  computeHoldings,
  holdingWindowRemaining,
  taxCoverageRatio,
  taxStatusFromCoverage,
} from "@/lib/retirement/calc";
import { FAMILY_MEMBERS, GIFT_RECORD } from "@/lib/retirement/data";
import { cn } from "@/lib/cn";

export default function TaxDashboardPage() {
  const { quotes, ready } = useRetirementQuotes();

  const rows = useMemo(() => {
    return FAMILY_MEMBERS.map((m) => {
      const holdings = computeHoldings(m.portfolioCore, quotes);
      const annualDiv = annualDividendFromHoldings(holdings);
      const portfolioMv = m.portfolioCore + m.portfolioSurplus;
      const coverage = taxCoverageRatio(portfolioMv, m.bankDeposits, annualDiv);
      const status = taxStatusFromCoverage(coverage);
      const window = holdingWindowRemaining(m.holdingWindowStartYear);
      return { member: m, annualDiv, portfolioMv, coverage, status, window };
    });
  }, [quotes]);

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
          PP 9/2021 · 0% dividend tax if reinvested
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">Tax Dashboard</h1>
        <div className="rule-gold mt-3 w-28" />
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Coverage = (stock portfolio + bank deposits) ÷ annual dividend. Maintain
          ≥1.5× for comfort; below 1.0× may trigger dividend tax.
        </p>
      </div>

      <RetirementSubnav />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {rows.map(({ member, annualDiv, portfolioMv, coverage, status, window }, i) => (
          <Card
            key={member.id}
            accent
            className="fade-up"
            style={{ animationDelay: `${60 + i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-serif text-xl text-foreground">{member.name}</h3>
                <Link
                  href={`/retirement/${member.id}`}
                  className="text-xs text-gold hover:underline"
                >
                  View portfolio →
                </Link>
              </div>
              <StatusPill status={status} />
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Annual dividend">
                <Rp value={annualDiv} className="text-gain" />
              </Row>
              <Row label="Qualifying investments">
                <Rp value={portfolioMv + member.bankDeposits} />
              </Row>
              <Row label="↳ Stock portfolio">
                <Rp value={portfolioMv} className="text-muted" />
              </Row>
              <Row label="↳ Bank deposits">
                <Rp value={member.bankDeposits} className="text-muted" />
              </Row>
              <Row label="Coverage ratio">
                <span
                  className={cn(
                    "tnum font-medium",
                    status === "EXEMPT" && "text-gain",
                    status === "WARNING" && "text-gold",
                    status === "DANGER" && "text-loss",
                  )}
                >
                  {coverage === Infinity ? "∞" : `${coverage.toFixed(2)}×`}
                </span>
              </Row>
              <Row label="3-year window">
                <span className="tnum">
                  {window.yearsLeft.toFixed(1)}y left
                  {window.expiringSoon && (
                    <Badge className="ml-2 border-burgundy/40 bg-burgundy/10 text-burgundy">
                      NOTICE
                    </Badge>
                  )}
                </span>
              </Row>
            </dl>

            {coverage < 1.5 && coverage >= 1.0 && (
              <Alert tone="warn">
                Coverage under 1.5× — consider parking more in qualifying deposits.
              </Alert>
            )}
            {coverage < 1.0 && (
              <Alert tone="danger">
                Coverage under 1.0× — dividend tax may apply under PP 9/2021.
              </Alert>
            )}
            {window.expiringSoon && (
              <Alert tone="notice">
                Holding window expires within 6 months — plan renewals.
              </Alert>
            )}

            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted">
                SPT checklist
              </div>
              <Checklist ok={member.sptFiled} label="SPT filed" />
              <Checklist
                ok={member.dividendDeclaredAsInvested}
                label="Dividend declared as invested"
              />
              <Checklist
                ok={member.brokerStatementsAttached}
                label="Broker statements attached"
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Gift tax — Son only */}
      <Card className="fade-up" style={{ animationDelay: "240ms" }}>
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Gift size={18} className="text-gold" /> Gift Tax Tracker — Son
            </span>
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted">Gift amount</div>
            <Rp value={GIFT_RECORD.amount} className="font-serif text-2xl text-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted">Tax owed</div>
            <Rp value={GIFT_RECORD.taxOwed} className="font-serif text-2xl text-gain" />
          </div>
          <div>
            <div className="text-xs text-muted">Legal basis</div>
            <p className="mt-1 text-sm text-ink-soft">{GIFT_RECORD.legalBasis}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Checklist ok={GIFT_RECORD.aktaHibah} label="Akta hibah present" />
          <Checklist ok={GIFT_RECORD.sptReported} label="SPT reported" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Parent-to-child hibah is non-taxable under UU PPh pasal 4 ayat 3. Keep
          documentary evidence for the 3-year look-back.
        </p>
      </Card>

      <p className="text-xs text-muted">
        Alert rules: coverage &lt; 1.5× → WARNING · coverage &lt; 1.0× → DANGER ·
        window &lt; 6 months → NOTICE. Coverage uses portfolio market value + bank
        deposits ÷ annual dividend.
      </p>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Checklist({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      {ok ? (
        <Check size={16} className="text-gain" />
      ) : (
        <X size={16} className="text-loss" />
      )}
      <span className={ok ? "text-foreground" : "text-muted"}>{label}</span>
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "warn" | "danger" | "notice";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-3 flex gap-2 rounded-lg border px-3 py-2 text-xs",
        tone === "warn" && "border-gold/40 bg-gold-tint/30 text-gold-soft dark:text-gold",
        tone === "danger" && "border-loss/40 bg-loss/10 text-loss",
        tone === "notice" && "border-burgundy/40 bg-burgundy/10 text-burgundy",
      )}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
