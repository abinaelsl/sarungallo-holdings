"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePortfolio } from "@/components/PortfolioProvider";
import { ClassSection } from "@/components/HoldingsTable";
import { HoldingForm } from "@/components/HoldingForm";
import { Button } from "@/components/ui";
import { ASSET_CLASSES } from "@/lib/types";

export default function HoldingsPage() {
  const { loading } = usePortfolio();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Holdings</h1>
          <p className="text-sm text-muted">
            Manage every position across all asset classes.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} /> Add holding
        </Button>
      </div>

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          {ASSET_CLASSES.map((c) => (
            <ClassSection key={c.value} assetClass={c.value} />
          ))}
        </div>
      )}

      <HoldingForm open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
