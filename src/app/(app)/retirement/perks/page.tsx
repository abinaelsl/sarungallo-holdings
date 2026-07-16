"use client";

import { Card, SectionHeader, Badge } from "@/components/ui";
import { RetirementSubnav } from "@/components/retirement/RetirementSubnav";
import { Rp } from "@/components/retirement/RetirementUi";
import {
  PERK_COLUMNS,
  PERK_OVERLAPS,
  PERKS_BNI_ANNUAL,
  PERKS_GRID,
  PERKS_MOM_ANNUAL,
} from "@/lib/retirement/data";
import { perkColumnTotal } from "@/lib/retirement/calc";
import { cn } from "@/lib/cn";

export default function PerksPage() {
  const columnTotals = PERK_COLUMNS.map((c) => ({
    ...c,
    total: perkColumnTotal(c.key),
  }));

  const dadSon = PERKS_BNI_ANNUAL;
  const mom = PERKS_MOM_ANNUAL;
  const combined = dadSon * 2 + mom;

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">
          BNI Prioritas · BRI Prioritas
        </div>
        <h1 className="mt-1 font-serif text-3xl text-foreground">
          Perks Dashboard
        </h1>
        <div className="rule-gold mt-3 w-28" />
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Dad &amp; Son: BNI only (~Rp9.7M/yr). Mom: BNI + BRI with overlap
          haircut (~Rp15.2M/yr combined).
        </p>
      </div>

      <RetirementSubnav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card accent className="fade-up py-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Dad / Son (each)
          </div>
          <Rp value={dadSon} className="mt-1 font-serif text-2xl text-gold" />
        </Card>
        <Card accent className="fade-up py-4" style={{ animationDelay: "60ms" }}>
          <div className="text-xs uppercase tracking-wide text-muted">
            Mom (BNI + BRI)
          </div>
          <Rp value={mom} className="mt-1 font-serif text-2xl text-gold" />
        </Card>
        <Card accent className="fade-up py-4" style={{ animationDelay: "120ms" }}>
          <div className="text-xs uppercase tracking-wide text-muted">
            Family combined
          </div>
          <Rp value={combined} className="mt-1 font-serif text-2xl text-gain" />
        </Card>
      </div>

      <Card className="fade-up overflow-x-auto p-0" style={{ animationDelay: "160ms" }}>
        <div className="border-b border-border px-5 py-4">
          <SectionHeader title="Perk Matrix" className="mb-0" />
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Perk</th>
              {PERK_COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-3 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERKS_GRID.map((perk) => (
              <tr key={perk.id} className="border-b border-border/60">
                <td className="px-5 py-3 font-medium text-foreground">
                  {perk.name}
                  {perk.id === "travel_insurance" && (
                    <Badge className="ml-2 border-gold/30 text-gold">overlap</Badge>
                  )}
                </td>
                {PERK_COLUMNS.map((c) => {
                  const cell = perk.values[c.key];
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-3",
                        cell?.active ? "text-foreground" : "text-muted",
                      )}
                    >
                      {cell?.label ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-surface-2/40 font-medium">
              <td className="px-5 py-3">Attributed value</td>
              {columnTotals.map((c) => (
                <td key={c.key} className="px-3 py-3 text-gold">
                  <Rp value={c.total} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="fade-up" style={{ animationDelay: "220ms" }}>
        <SectionHeader title="Overlap Notes" />
        <ul className="space-y-3">
          {PERK_OVERLAPS.map((o) => (
            <li key={o.perk} className="text-sm">
              <span className="font-medium text-foreground">{o.perk}</span>
              <span className="text-muted"> — {o.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Strategy totals (Dad/Son Rp9.7M, Mom Rp15.2M) are the canonical figures
          used in income stacks. Matrix attributed values may differ slightly where
          soft perks (concierge) have no cash equivalent.
        </p>
      </Card>
    </div>
  );
}
