"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Holding, AssetClass, ASSET_CLASS_LABEL } from "@/lib/types";
import { holdingValueUsd, holdingPnlUsd, holdingPnlPct } from "@/lib/calc";
import { Money, Button, Badge } from "./ui";
import { formatNumber, formatPct, gainClass } from "@/lib/format";
import { HoldingForm } from "./HoldingForm";
import { usePortfolio } from "./PortfolioProvider";
import { CLASS_COLORS } from "./charts";

export function ClassSection({ assetClass }: { assetClass: AssetClass }) {
  const { holdings, deleteHolding } = usePortfolio();
  const [editing, setEditing] = useState<Holding | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = holdings.filter((h) => h.asset_class === assetClass);
  const total = rows.reduce((s, h) => s + holdingValueUsd(h), 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: CLASS_COLORS[assetClass] }}
          />
          <h2 className="font-serif text-lg">{ASSET_CLASS_LABEL[assetClass]}</h2>
          <Badge>{rows.length}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            <Money usd={total} />
          </span>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted">
          No {ASSET_CLASS_LABEL[assetClass].toLowerCase()} yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Ticker</th>
                <th className="px-3 py-3 text-right font-medium">Qty</th>
                <th className="px-3 py-3 text-right font-medium">Cost</th>
                <th className="px-3 py-3 text-right font-medium">Value</th>
                <th className="px-3 py-3 text-right font-medium">P/L</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const pnl = holdingPnlUsd(h);
                const pct = holdingPnlPct(h);
                return (
                  <tr
                    key={h.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface-2/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/holdings/${h.id}`}
                        className="font-medium text-foreground hover:text-gold"
                      >
                        {h.name}
                      </Link>
                      {h.sector && (
                        <div className="text-xs text-muted">{h.sector}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">{h.ticker ?? "—"}</td>
                    <td className="px-3 py-3 text-right text-muted">
                      {h.quantity != null
                        ? `${formatNumber(h.quantity, 4)}${h.unit ? " " + h.unit : ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-muted">
                      <Money usd={h.cost_basis_usd} />
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      <Money usd={holdingValueUsd(h)} />
                    </td>
                    <td className={`px-3 py-3 text-right ${gainClass(pnl)}`}>
                      <div>
                        <Money usd={pnl} />
                      </div>
                      <div className="text-xs">{formatPct(pct)}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(h)}
                          className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground cursor-pointer"
                          aria-label="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        {confirmId === h.id ? (
                          <button
                            onClick={async () => {
                              await deleteHolding(h.id);
                              setConfirmId(null);
                            }}
                            className="rounded-md px-2 py-1 text-xs font-medium text-loss hover:bg-loss/10 cursor-pointer"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmId(h.id)}
                            className="rounded-md p-1.5 text-muted hover:bg-loss/10 hover:text-loss cursor-pointer"
                            aria-label="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <HoldingForm
        open={adding}
        onClose={() => setAdding(false)}
        presetClass={assetClass}
      />
      <HoldingForm
        open={!!editing}
        onClose={() => setEditing(null)}
        holding={editing}
      />
    </section>
  );
}
