"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Building2, LineChart, TrendingUp, CalendarDays, DollarSign } from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { Card, Money, Input } from "@/components/ui";
import { holdingValueUsd, usdPerNative } from "@/lib/calc";
import { Holding } from "@/lib/types";
import { formatNumber, formatPct } from "@/lib/format";

const RENT_KEY = "sh_income_rent"; // real-estate monthly rent stays local

type RentInputs = Record<string, string>;

function loadRent(): RentInputs {
  if (typeof window === "undefined") return {};
  try {
    // Migrate from the older combined key if present.
    const legacy = localStorage.getItem("sh_income_inputs");
    const current = localStorage.getItem(RENT_KEY);
    return JSON.parse(current ?? legacy ?? "{}");
  } catch {
    return {};
  }
}

function annualRent(raw: string): number {
  const v = parseFloat(raw);
  if (!raw.trim() || isNaN(v) || v <= 0) return 0;
  return v * 12; // monthly rent (USD) → annual
}

/** Annual dividend in USD for an equity, given a per-share native input. */
function eqAnnualUsd(h: Holding, perShareRaw: string): number {
  const per = parseFloat(perShareRaw);
  if (!perShareRaw.trim() || isNaN(per) || per <= 0) return 0;
  const qty = h.quantity ?? 0;
  return per * qty * usdPerNative(h);
}

function eqYieldOnCost(h: Holding, perShareRaw: string): number | null {
  const per = parseFloat(perShareRaw);
  if (!perShareRaw.trim() || isNaN(per) || per <= 0) return null;
  if (h.avg_cost_native != null && h.avg_cost_native > 0) {
    return (per / h.avg_cost_native) * 100;
  }
  return null;
}

export default function IncomePage() {
  const { holdings, loading, updateHolding } = usePortfolio();
  const [rent, setRent] = useState<RentInputs>({});
  // Equity dividend-per-share, seeded from the DB, edited locally, saved on blur.
  const [div, setDiv] = useState<Record<string, string>>({});

  useEffect(() => {
    setRent(loadRent());
  }, []);

  // Seed dividend inputs whenever holdings load/refresh.
  useEffect(() => {
    setDiv((prev) => {
      const next = { ...prev };
      for (const h of holdings) {
        if (h.asset_class === "equity" && !(h.id in next)) {
          next[h.id] =
            h.annual_dividend_per_share != null
              ? String(h.annual_dividend_per_share)
              : "";
        }
      }
      return next;
    });
  }, [holdings]);

  const setRentInput = useCallback((id: string, value: string) => {
    setRent((prev) => {
      const next = { ...prev, [id]: value };
      localStorage.setItem(RENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const saveDiv = useCallback(
    (h: Holding, value: string) => {
      const num = value.trim() ? Number(value) : null;
      if ((h.annual_dividend_per_share ?? null) === num) return;
      updateHolding(h.id, { annual_dividend_per_share: num } as Record<string, unknown>);
    },
    [updateHolding],
  );

  const reHoldings = useMemo(
    () => holdings.filter((h) => h.asset_class === "real_estate"),
    [holdings],
  );
  const eqHoldings = useMemo(
    () => holdings.filter((h) => h.asset_class === "equity"),
    [holdings],
  );

  const { reAnnual, eqAnnual, totalAnnual, totalCost } = useMemo(() => {
    const reAnnual = reHoldings.reduce((s, h) => s + annualRent(rent[h.id] ?? ""), 0);
    const eqAnnual = eqHoldings.reduce(
      (s, h) => s + eqAnnualUsd(h, div[h.id] ?? ""),
      0,
    );
    const totalAnnual = reAnnual + eqAnnual;
    const totalCost = holdings.reduce((s, h) => s + (h.cost_basis_usd ?? 0), 0);
    return { reAnnual, eqAnnual, totalAnnual, totalCost };
  }, [holdings, reHoldings, eqHoldings, rent, div]);

  const yieldOnCost = totalCost > 0 ? (totalAnnual / totalCost) * 100 : null;

  if (loading) return <div className="text-muted">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Passive Income</h1>
        <p className="mt-1 text-sm text-muted">
          Estimated annual income from rent and dividends. Dividend yields are computed
          against your average purchase price.
        </p>
        <div className="rule-gold mt-4 w-28" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={CalendarDays}
          label="Annual Income"
          value={<Money usd={totalAnnual} className="font-serif text-2xl text-foreground" />}
        />
        <SummaryCard
          icon={DollarSign}
          label="Monthly Income"
          value={<Money usd={totalAnnual / 12} className="font-serif text-2xl text-foreground" />}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Yield on Cost"
          value={
            <span className="font-serif text-2xl text-foreground">
              {yieldOnCost != null ? `${yieldOnCost.toFixed(2)}%` : "—"}
            </span>
          }
        />
      </div>

      {/* Income mix */}
      {totalAnnual > 0 && (
        <Card>
          <h2 className="mb-3 font-serif text-lg">Income Mix</h2>
          <IncomeBar reAnnual={reAnnual} eqAnnual={eqAnnual} total={totalAnnual} />
          <div className="mt-3 flex gap-6 text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" />
              Rent{" "}
              <span className="text-foreground">
                {`${((reAnnual / totalAnnual) * 100).toFixed(1)}%`}
              </span>
            </span>
            <span className="flex items-center gap-2 text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
              Dividends{" "}
              <span className="text-foreground">
                {`${((eqAnnual / totalAnnual) * 100).toFixed(1)}%`}
              </span>
            </span>
          </div>
        </Card>
      )}

      {/* Real Estate */}
      {reHoldings.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-gold" />
            <h2 className="font-serif text-lg">Real Estate — Rental Income</h2>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-3 px-2 pb-1 text-xs uppercase tracking-wide text-muted">
              <span className="col-span-4">Property</span>
              <span className="col-span-3 text-right">Current Value</span>
              <span className="col-span-3">Monthly Rent (USD)</span>
              <span className="col-span-2 text-right">Annual</span>
            </div>
            {reHoldings.map((h) => {
              const raw = rent[h.id] ?? "";
              const annual = annualRent(raw);
              const yoc = h.cost_basis_usd && annual > 0 ? (annual / h.cost_basis_usd) * 100 : null;
              return (
                <div
                  key={h.id}
                  className="grid grid-cols-12 items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2/40"
                >
                  <div className="col-span-4 min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{h.name}</div>
                    {h.location && <div className="truncate text-xs text-muted">{h.location}</div>}
                  </div>
                  <div className="col-span-3 text-right text-sm text-muted">
                    <Money usd={holdingValueUsd(h)} />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={raw}
                      onChange={(e) => setRentInput(h.id, e.target.value)}
                      className="py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    {annual > 0 ? (
                      <div>
                        <Money usd={annual} className="text-sm text-foreground" />
                        {yoc != null && (
                          <div className="text-xs text-muted">{formatPct(yoc)} YoC</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="mt-2 flex justify-between border-t border-border pt-3 px-2">
              <span className="text-sm font-medium text-muted">Subtotal (annual)</span>
              <Money usd={reAnnual} className="text-sm font-semibold text-foreground" />
            </div>
          </div>
        </Card>
      )}

      {/* Equities */}
      {eqHoldings.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <LineChart size={18} className="text-blue-400" />
            <h2 className="font-serif text-lg">Equities — Dividend Income</h2>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-3 px-2 pb-1 text-xs uppercase tracking-wide text-muted">
              <span className="col-span-4">Stock</span>
              <span className="col-span-2 text-right">Shares</span>
              <span className="col-span-3">Annual Div / Share</span>
              <span className="col-span-1 text-right">YoC</span>
              <span className="col-span-2 text-right">Annual</span>
            </div>
            {eqHoldings.map((h) => {
              const raw = div[h.id] ?? "";
              const annual = eqAnnualUsd(h, raw);
              const yoc = eqYieldOnCost(h, raw);
              const cur = h.currency || "USD";
              return (
                <div
                  key={h.id}
                  className="grid grid-cols-12 items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2/40"
                >
                  <div className="col-span-4 min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{h.name}</div>
                    <div className="truncate text-xs text-muted">
                      {h.ticker ?? "—"}
                      {h.avg_cost_native != null && (
                        <> · avg {formatNumber(h.avg_cost_native, 2)} {cur}</>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-sm text-muted tnum">
                    {h.quantity != null ? formatNumber(h.quantity, 0) : "—"}
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={raw}
                        onChange={(e) => setDiv((p) => ({ ...p, [h.id]: e.target.value }))}
                        onBlur={(e) => saveDiv(h, e.target.value)}
                        className="py-1.5 pr-10 text-sm"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
                        {cur}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 text-right text-sm text-gold tnum">
                    {yoc != null ? `${yoc.toFixed(1)}%` : "—"}
                  </div>
                  <div className="col-span-2 text-right">
                    {annual > 0 ? (
                      <Money usd={annual} className="text-sm text-foreground" />
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="mt-2 flex justify-between border-t border-border pt-3 px-2">
              <span className="text-sm font-medium text-muted">Subtotal (annual)</span>
              <Money usd={eqAnnual} className="text-sm font-semibold text-foreground" />
            </div>
          </div>
        </Card>
      )}

      {reHoldings.length === 0 && eqHoldings.length === 0 && (
        <div className="py-16 text-center text-muted text-sm">
          No real estate or equity holdings found. Add some holdings first.
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-1.5">{value}</div>
    </Card>
  );
}

function IncomeBar({
  reAnnual,
  eqAnnual,
  total,
}: {
  reAnnual: number;
  eqAnnual: number;
  total: number;
}) {
  const rePct = total > 0 ? (reAnnual / total) * 100 : 0;
  const eqPct = 100 - rePct;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="flex h-full">
        {rePct > 0 && (
          <div className="h-full bg-gold transition-all" style={{ width: `${rePct}%` }} />
        )}
        {eqPct > 0 && (
          <div className="h-full bg-blue-400 transition-all" style={{ width: `${eqPct}%` }} />
        )}
      </div>
    </div>
  );
}
