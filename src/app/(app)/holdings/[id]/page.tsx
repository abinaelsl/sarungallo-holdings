"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { Card, Money, Button, Badge, SectionHeader, Skeleton } from "@/components/ui";
import { HoldingForm } from "@/components/HoldingForm";
import { TradePanel } from "@/components/TradePanel";
import { AvgCalcPanel } from "@/components/AvgCalcPanel";
import { DividendPanel } from "@/components/DividendPanel";
import { ValueOverTime } from "@/components/charts";
import {
  holdingValueUsd,
  holdingPnlUsd,
  holdingPnlPct,
  avgCostUsd,
  lotSize,
  nativePerUsd,
} from "@/lib/calc";
import { computePosition } from "@/lib/positions";
import {
  formatNumber,
  formatNative,
  formatUSD,
  formatPct,
  gainClass,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import {
  ASSET_CLASS_LABEL,
  Transaction,
  Dividend,
  HoldingSnapshot,
} from "@/lib/types";
import { cn } from "@/lib/cn";

type TabId =
  | "performance"
  | "dividends"
  | "details"
  | "buy"
  | "sell"
  | "history"
  | "avgcalc";

export default function HoldingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { holdings, loading, currency, fxUsdIdr, deleteHolding, deleteTransaction } =
    usePortfolio();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tab, setTab] = useState<TabId>("performance");

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [history, setHistory] = useState<HoldingSnapshot[]>([]);

  const loadDetail = useCallback(async () => {
    const [t, d, s] = await Promise.all([
      fetch(`/api/holdings/${id}/transactions`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/holdings/${id}/dividends`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/holdings/${id}/snapshots`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    setTxns(t.transactions ?? []);
    setDividends(d.dividends ?? []);
    setHistory(s.snapshots ?? []);
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const h = holdings.find((x) => x.id === id);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  if (!h) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Holding not found.</p>
        <Link href="/holdings" className="mt-4 inline-block text-gold hover:underline">
          ← Back to holdings
        </Link>
      </div>
    );
  }

  const value = holdingValueUsd(h);
  const pnl = holdingPnlUsd(h);
  const pct = holdingPnlPct(h);
  const isRE = h.asset_class === "real_estate";
  const isTradable = h.asset_class === "equity" || h.asset_class === "crypto";
  const isEquity = h.asset_class === "equity";
  const cur = h.currency || "USD";
  const lot = lotSize(h);
  const usesLots = lot > 1;
  const qty = h.quantity ?? 0;

  const realized = computePosition(txns).realized_pnl_usd;
  const acUsd = avgCostUsd(h);
  const costNative = h.avg_cost_native != null ? h.avg_cost_native * qty : null;

  const chartData = history.map((s) => ({
    t: formatDate(s.captured_at),
    value: s.value_usd,
    cost: s.cost_usd,
  }));

  const detailRows: [string, React.ReactNode][] = [
    ["Asset class", ASSET_CLASS_LABEL[h.asset_class]],
    ["Sector", h.sector ?? "—"],
    ...(!isRE
      ? ([
          ["Ticker", h.ticker ?? "—"],
          ["Trading currency", cur],
          ["Exchange", h.exchange ?? "—"],
          [
            "Last price",
            h.current_price_native != null
              ? formatNative(h.current_price_native, cur)
              : "—",
          ],
          ["Priced at", h.price_updated_at ? formatDateTime(h.price_updated_at) : "Not yet"],
        ] as [string, React.ReactNode][])
      : ([["Location", h.location ?? "—"]] as [string, React.ReactNode][])),
    ["Acquired", formatDate(h.acquisition_date)],
  ];

  const tabs: { id: TabId; label: string }[] = [
    { id: "performance", label: "Performance" },
    ...(isEquity ? [{ id: "dividends" as TabId, label: "Dividends" }] : []),
    { id: "details", label: "Details" },
    ...(isTradable
      ? [
          { id: "buy" as TabId, label: "Buy" },
          { id: "sell" as TabId, label: "Sell" },
          { id: "history" as TabId, label: "History" },
          { id: "avgcalc" as TabId, label: "Avg. Calc" },
        ]
      : []),
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "performance";

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/holdings"
        className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Back to Portfolio
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted">
            {ASSET_CLASS_LABEL[h.asset_class]}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl text-foreground">{h.ticker ?? h.name}</h1>
            {h.exchange && <Badge>{h.exchange}</Badge>}
            {h.sector && (
              <span className="text-sm font-medium text-burgundy">{h.sector}</span>
            )}
          </div>
          {h.ticker && <p className="mt-1 text-foreground">{h.name}</p>}
          <p className="mt-0.5 text-sm text-muted">
            Position opened {formatDate(h.acquisition_date)}
          </p>
          <div className="rule-gold mt-3 w-20" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit Position
          </Button>
          {confirming ? (
            <Button
              variant="danger"
              onClick={async () => {
                await deleteHolding(h.id);
                router.push("/holdings");
              }}
            >
              Confirm delete
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>

      {/* Metric cards */}
      {isTradable ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={usesLots ? "Lots Owned" : "Shares Owned"}>
            <div className="font-serif text-2xl text-foreground">
              {usesLots
                ? `${formatNumber(qty / lot, 0)} lots`
                : `${formatNumber(qty, 4)}`}
            </div>
            {usesLots && (
              <div className="text-xs text-muted">{formatNumber(qty, 0)} shares</div>
            )}
          </Stat>
          <Stat label="Avg. Buy Price">
            <div className="font-serif text-2xl text-foreground">
              {h.avg_cost_native != null ? formatNative(h.avg_cost_native, cur) : "—"}
            </div>
            {acUsd != null && <div className="text-xs text-muted">{formatUSD(acUsd)}</div>}
          </Stat>
          <Stat label="Cost Basis">
            <div className="font-serif text-2xl text-foreground">
              {costNative != null ? formatNative(costNative, cur, { compact: true }) : "—"}
            </div>
            <div className="text-xs text-muted">{formatUSD(h.cost_basis_usd, { compact: true })}</div>
          </Stat>
          <Stat label={cur === "USD" ? "Current Value" : "Exchange Rate"}>
            {cur === "USD" ? (
              <div className="font-serif text-2xl text-foreground">
                <Money usd={value} />
              </div>
            ) : (
              <>
                <div className="font-serif text-2xl text-foreground">
                  {formatNative(nativePerUsd(h), cur, { maxDigits: 0 })}
                </div>
                <div className="text-xs text-muted">per USD</div>
              </>
            )}
          </Stat>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card accent interactive>
            <div className="text-xs uppercase tracking-wide text-muted">Current Value</div>
            <Money usd={value} className="mt-1.5 block font-serif text-2xl text-foreground" />
            {currency === "USD" && (
              <div className="mt-1 text-xs text-muted">
                ≈ Rp {(value * fxUsdIdr).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            )}
          </Card>
          <Card accent interactive>
            <div className="text-xs uppercase tracking-wide text-muted">Cost Basis</div>
            <Money usd={h.cost_basis_usd} className="mt-1.5 block font-serif text-2xl text-foreground" />
          </Card>
          <Card accent interactive>
            <div className="text-xs uppercase tracking-wide text-muted">Unrealized P/L</div>
            <div className={`mt-1.5 font-serif text-2xl ${gainClass(pnl)}`}>
              <Money usd={pnl} />
            </div>
            <div className={`text-sm ${gainClass(pnl)}`}>{formatPct(pct)}</div>
          </Card>
        </div>
      )}

      {/* P/L strip for tradable (value + unrealized) */}
      {isTradable && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Current Value">
            <div className="font-serif text-xl text-foreground">
              <Money usd={value} />
            </div>
          </Stat>
          <Stat label="Unrealized P/L">
            <div className={`font-serif text-xl ${gainClass(pnl)}`}>
              <Money usd={pnl} /> <span className="text-sm">{formatPct(pct)}</span>
            </div>
          </Stat>
          <Stat label="Realized P/L">
            <div className={`font-serif text-xl ${gainClass(realized)}`}>
              <Money usd={realized} />
            </div>
          </Stat>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex flex-wrap gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                activeTab === t.id
                  ? "border-b-2 border-gold text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card className="mt-4">
          {activeTab === "performance" && (
            <>
              <SectionHeader title="Performance" />
              {chartData.length > 0 ? (
                <ValueOverTime data={chartData} />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted">
                  Hit Refresh on the portfolio to start tracking this position over time.
                </div>
              )}
            </>
          )}

          {activeTab === "dividends" && (
            <DividendPanel holding={h} dividends={dividends} onChange={loadDetail} />
          )}

          {activeTab === "details" && (
            <>
              <SectionHeader title="Details" />
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {detailRows.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/50 pb-2">
                    <dt className="text-sm text-muted">{k}</dt>
                    <dd className="text-sm text-foreground text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              {h.notes && (
                <div className="mt-4">
                  <div className="mb-1 text-sm text-muted">Notes</div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{h.notes}</p>
                </div>
              )}
            </>
          )}

          {activeTab === "buy" && (
            <TradePanel holding={h} type="buy" onDone={loadDetail} />
          )}

          {activeTab === "sell" && (
            <TradePanel holding={h} type="sell" onDone={loadDetail} />
          )}

          {activeTab === "avgcalc" && <AvgCalcPanel holding={h} />}

          {activeTab === "history" && (
            <>
              <SectionHeader title="Transaction History" />
              {txns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 text-right font-medium">
                          {usesLots ? "Lots" : "Shares"}
                        </th>
                        <th className="py-2 px-3 text-right font-medium">Price</th>
                        <th className="py-2 px-3 text-right font-medium">Value ({cur})</th>
                        <th className="py-2 pl-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t) => {
                        const gross =
                          t.shares * t.price_native +
                          (t.type === "buy" ? t.fees_native : -t.fees_native);
                        return (
                          <tr key={t.id} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-3 text-muted">{formatDate(t.trade_date)}</td>
                            <td className="py-2 px-3">
                              <span
                                className={
                                  t.type === "buy"
                                    ? "inline-flex items-center gap-1 text-gain"
                                    : "inline-flex items-center gap-1 text-loss"
                                }
                              >
                                {t.type === "buy" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {t.type === "buy" ? "Buy" : "Sell"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right tnum">
                              {usesLots ? formatNumber(t.shares / lot, 0) : formatNumber(t.shares, 4)}
                            </td>
                            <td className="py-2 px-3 text-right tnum text-muted">
                              {formatNative(t.price_native, cur)}
                            </td>
                            <td className="py-2 px-3 text-right tnum text-foreground">
                              {formatNative(gross, cur, { compact: true })}
                            </td>
                            <td className="py-2 pl-3 text-right">
                              <button
                                onClick={async () => {
                                  await deleteTransaction(t.id);
                                  await loadDetail();
                                }}
                                className="rounded-md p-1.5 text-muted hover:bg-loss/10 hover:text-loss cursor-pointer"
                                aria-label="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No transactions recorded yet. Use the Buy / Sell tabs to log trades.
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <HoldingForm open={editing} onClose={() => setEditing(false)} holding={h} />
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card accent interactive className="py-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1">{children}</div>
    </Card>
  );
}
