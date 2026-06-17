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
import { Card, Money, Button, Badge } from "@/components/ui";
import { HoldingForm } from "@/components/HoldingForm";
import { TradeModal } from "@/components/TradeModal";
import { DividendPanel } from "@/components/DividendPanel";
import { ValueOverTime } from "@/components/charts";
import {
  holdingValueUsd,
  holdingPnlUsd,
  holdingPnlPct,
  avgCostUsd,
} from "@/lib/calc";
import { computePosition } from "@/lib/positions";
import {
  formatNumber,
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
  TxnType,
} from "@/lib/types";

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
  const [trade, setTrade] = useState<TxnType | null>(null);

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

  if (loading) return <div className="text-muted">Loading…</div>;
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

  const realized = computePosition(txns).realized_pnl_usd;
  const acUsd = avgCostUsd(h);

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
              ? `${formatNumber(h.current_price_native, 4)} ${cur}`
              : "—",
          ],
          ["Priced at", h.price_updated_at ? formatDateTime(h.price_updated_at) : "Not yet"],
        ] as [string, React.ReactNode][])
      : ([["Location", h.location ?? "—"]] as [string, React.ReactNode][])),
    ["Acquired", formatDate(h.acquisition_date)],
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/holdings"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Holdings
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-foreground">{h.name}</h1>
            <Badge>{ASSET_CLASS_LABEL[h.asset_class]}</Badge>
          </div>
          {h.ticker && <p className="mt-1 text-muted">{h.ticker}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {isTradable && (
            <>
              <Button onClick={() => setTrade("buy")}>
                <TrendingUp size={15} /> Buy
              </Button>
              <Button variant="outline" onClick={() => setTrade("sell")}>
                <TrendingDown size={15} /> Sell
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit
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
              <Trash2 size={15} /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Current Value</div>
          <Money usd={value} className="mt-1.5 block font-serif text-2xl text-foreground" />
          {currency === "USD" && (
            <div className="mt-1 text-xs text-muted">
              ≈ Rp {(value * fxUsdIdr).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          )}
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Cost Basis</div>
          <Money
            usd={h.cost_basis_usd}
            className="mt-1.5 block font-serif text-2xl text-foreground"
          />
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted">Unrealized P/L</div>
          <div className={`mt-1.5 font-serif text-2xl ${gainClass(pnl)}`}>
            <Money usd={pnl} />
          </div>
          <div className={`text-sm ${gainClass(pnl)}`}>{formatPct(pct)}</div>
        </Card>
      </div>

      {/* Position & average cost */}
      {!isRE && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label={isEquity ? "Shares" : "Quantity"}>
            {h.quantity != null ? `${formatNumber(h.quantity, 4)}${h.unit ? " " + h.unit : ""}` : "—"}
          </MiniStat>
          <MiniStat label="Avg cost / share">
            {h.avg_cost_native != null
              ? `${formatNumber(h.avg_cost_native, 2)} ${cur}`
              : "—"}
            {acUsd != null && (
              <div className="text-xs text-muted">
                <Money usd={acUsd} />
              </div>
            )}
          </MiniStat>
          <MiniStat label="Current price">
            {h.current_price_native != null
              ? `${formatNumber(h.current_price_native, 2)} ${cur}`
              : "—"}
          </MiniStat>
          <MiniStat label="Realized P/L">
            <span className={gainClass(realized)}>
              <Money usd={realized} />
            </span>
          </MiniStat>
        </div>
      )}

      {/* Performance */}
      <Card>
        <h2 className="mb-4 font-serif text-lg">Performance</h2>
        {chartData.length > 0 ? (
          <ValueOverTime data={chartData} />
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted">
            Hit Refresh to start tracking this position over time.
          </div>
        )}
      </Card>

      {/* Dividends (equities) */}
      {isEquity && (
        <DividendPanel holding={h} dividends={dividends} onChange={loadDetail} />
      )}

      {/* Transaction history */}
      {isTradable && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg">Transaction History</h2>
            <Button size="sm" variant="outline" onClick={() => setTrade("buy")}>
              <TrendingUp size={14} /> Add trade
            </Button>
          </div>
          {txns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 px-3 font-medium">Type</th>
                    <th className="py-2 px-3 text-right font-medium">Shares</th>
                    <th className="py-2 px-3 text-right font-medium">Price</th>
                    <th className="py-2 px-3 text-right font-medium">Value ({cur})</th>
                    <th className="py-2 pl-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => {
                    const gross = t.shares * t.price_native + (t.type === "buy" ? t.fees_native : -t.fees_native);
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
                        <td className="py-2 px-3 text-right tnum">{formatNumber(t.shares, 4)}</td>
                        <td className="py-2 px-3 text-right tnum text-muted">
                          {formatNumber(t.price_native, 2)}
                        </td>
                        <td className="py-2 px-3 text-right tnum text-foreground">
                          {formatNumber(gross, 2)}
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
              No trades recorded. Use Buy or Sell to build this position.
            </p>
          )}
        </Card>
      )}

      {/* Details */}
      <Card>
        <h2 className="mb-4 font-serif text-lg">Details</h2>
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
      </Card>

      <HoldingForm open={editing} onClose={() => setEditing(false)} holding={h} />
      {trade && (
        <TradeModal
          open={!!trade}
          onClose={() => setTrade(null)}
          holding={h}
          initialType={trade}
          onDone={loadDetail}
        />
      )}
    </div>
  );
}

function MiniStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground tnum">{children}</div>
    </div>
  );
}
