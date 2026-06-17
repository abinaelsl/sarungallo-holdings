"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { ClassSection } from "@/components/HoldingsTable";
import { HoldingForm } from "@/components/HoldingForm";
import { Button, Skeleton } from "@/components/ui";
import { ASSET_CLASSES } from "@/lib/types";

export default function HoldingsPage() {
  const { loading } = usePortfolio();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="fade-up flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted">Positions</div>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Holdings</h1>
          <div className="rule-gold mt-3 w-20" />
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} /> Add holding
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {ASSET_CLASSES.map((c, i) => (
            <div key={c.value} className="fade-up" style={{ animationDelay: `${80 + i * 60}ms` }}>
              <ClassSection assetClass={c.value} />
            </div>
          ))}
        </div>
      )}

      <HoldingForm open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
