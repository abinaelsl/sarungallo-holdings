"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { Card, Money, Button, Badge } from "@/components/ui";
import { HoldingForm } from "@/components/HoldingForm";
import { holdingValueUsd, holdingPnlUsd, holdingPnlPct } from "@/lib/calc";
import {
  formatNumber,
  formatPct,
  gainClass,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { ASSET_CLASS_LABEL } from "@/lib/types";

export default function HoldingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { holdings, loading, currency, fxUsdIdr, deleteHolding } = usePortfolio();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const rows: [string, React.ReactNode][] = [
    ["Asset class", ASSET_CLASS_LABEL[h.asset_class]],
    ["Sector", h.sector ?? "—"],
    ...(!isRE
      ? ([
          ["Ticker", h.ticker ?? "—"],
          [
            "Quantity",
            h.quantity != null
              ? `${formatNumber(h.quantity, 6)}${h.unit ? " " + h.unit : ""}`
              : "—",
          ],
          ["Trading currency", h.currency],
          [
            "Last price",
            h.current_price_native != null
              ? `${formatNumber(h.current_price_native, 4)} ${h.currency}`
              : "—",
          ],
          ["Exchange", h.exchange ?? "—"],
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
        <div className="flex gap-2">
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

      <Card>
        <h2 className="mb-4 font-serif text-lg">Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
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
    </div>
  );
}
