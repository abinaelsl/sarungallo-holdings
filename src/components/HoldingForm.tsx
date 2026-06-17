"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { AssetClass, ASSET_CLASSES, Holding } from "@/lib/types";
import { usePortfolio } from "./PortfolioProvider";

const SECTOR_SUGGESTIONS = [
  "RE – Residential",
  "RE – Mixed-Use",
  "RE – Commercial",
  "Banking & Finance",
  "Energy",
  "Mining",
  "Technology",
  "Consumer",
  "Healthcare",
  "Precious Metals",
  "Digital Assets",
];

type FormState = Record<string, string>;

function initialState(h?: Holding | null, presetClass?: AssetClass): FormState {
  return {
    asset_class: h?.asset_class ?? presetClass ?? "equity",
    name: h?.name ?? "",
    ticker: h?.ticker ?? "",
    sector: h?.sector ?? "",
    quantity: h?.quantity != null ? String(h.quantity) : "",
    unit: h?.unit ?? "",
    currency: h?.currency ?? "USD",
    cost_basis_usd: h?.cost_basis_usd != null ? String(h.cost_basis_usd) : "",
    annual_dividend_per_share:
      h?.annual_dividend_per_share != null ? String(h.annual_dividend_per_share) : "",
    manual_value_usd: h?.manual_value_usd != null ? String(h.manual_value_usd) : "",
    exchange: h?.exchange ?? "",
    location: h?.location ?? "",
    acquisition_date: h?.acquisition_date ?? "",
    notes: h?.notes ?? "",
  };
}

export function HoldingForm({
  open,
  onClose,
  holding,
  presetClass,
}: {
  open: boolean;
  onClose: () => void;
  holding?: Holding | null;
  presetClass?: AssetClass;
}) {
  const { createHolding, updateHolding } = usePortfolio();
  const [form, setForm] = useState<FormState>(() => initialState(holding, presetClass));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when the target holding changes.
  const [seededFor, setSeededFor] = useState(holding?.id ?? presetClass ?? "new");
  const seedKey = holding?.id ?? presetClass ?? "new";
  if (seedKey !== seededFor) {
    setForm(initialState(holding, presetClass));
    setSeededFor(seedKey);
  }

  const cls = form.asset_class as AssetClass;
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    const lock = isTradable && !!holding;
    const payload: Record<string, unknown> = {
      asset_class: form.asset_class,
      name: form.name.trim(),
      ticker: form.ticker.trim() || null,
      sector: form.sector.trim() || null,
      unit: form.unit || null,
      currency: form.currency || "USD",
      annual_dividend_per_share: form.annual_dividend_per_share
        ? Number(form.annual_dividend_per_share)
        : null,
      manual_value_usd: form.manual_value_usd ? Number(form.manual_value_usd) : null,
      exchange: form.exchange.trim() || null,
      location: form.location.trim() || null,
      acquisition_date: form.acquisition_date || null,
      notes: form.notes.trim() || null,
    };
    // Position fields are ledger-managed once a tradable holding exists.
    if (!lock) {
      payload.quantity = form.quantity ? Number(form.quantity) : null;
      payload.cost_basis_usd = form.cost_basis_usd ? Number(form.cost_basis_usd) : 0;
    }
    const result = holding
      ? await updateHolding(holding.id, payload)
      : await createHolding(payload);
    setSaving(false);
    if (result) onClose();
    else setError("Could not save. Check the fields and try again.");
  }

  const isRE = cls === "real_estate";
  const isGold = cls === "gold";
  const isCrypto = cls === "crypto";
  const isEquity = cls === "equity";
  const isTradable = isEquity || isCrypto;
  // Once a tradable holding exists, its position is driven by the Buy/Sell ledger.
  const lockPosition = isTradable && !!holding;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={holding ? "Edit holding" : "Add holding"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : holding ? "Save changes" : "Add holding"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Asset class">
            <Select
              value={form.asset_class}
              onChange={(e) => set("asset_class", e.target.value)}
            >
              {ASSET_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={
                isRE ? "Ciomas House" : isCrypto ? "Bitcoin" : "Bank Central Asia"
              }
            />
          </Field>
        </div>

        {!isRE && (
          <Field
            label="Ticker / symbol"
          >
            <Input
              value={form.ticker}
              onChange={(e) => set("ticker", e.target.value)}
              placeholder={
                isEquity ? "BBCA.JK" : isCrypto ? "BTC-USD" : "GC=F"
              }
            />
          </Field>
        )}

        <Field label="Sector">
          <Input
            list="sector-list"
            value={form.sector}
            onChange={(e) => set("sector", e.target.value)}
            placeholder="Banking & Finance"
          />
          <datalist id="sector-list">
            {SECTOR_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        {!isRE && !lockPosition && (
          <Field label={isCrypto ? "Quantity (coins)" : isGold ? "Quantity" : "Quantity (shares)"}>
            <Input
              type="number"
              step="any"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder={isEquity ? "10000" : isGold ? "100" : "0.5"}
            />
          </Field>
        )}

        {isGold && (
          <Field label="Unit">
            <Select value={form.unit || "oz"} onChange={(e) => set("unit", e.target.value)}>
              <option value="oz">troy ounces (oz)</option>
              <option value="g">grams (g)</option>
            </Select>
          </Field>
        )}

        {isEquity && (
          <>
            <Field label="Trading currency" hint="IDX stocks trade in IDR">
              <Select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="IDR">IDR</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SGD">SGD</option>
                <option value="JPY">JPY</option>
              </Select>
            </Field>
            <Field label="Exchange">
              <Input
                value={form.exchange}
                onChange={(e) => set("exchange", e.target.value)}
                placeholder="IDX"
              />
            </Field>
          </>
        )}

        {!lockPosition && (
          <Field
            label="Cost basis (USD)"
            hint={isTradable ? "Total invested — seeds an opening trade" : "Total amount invested"}
          >
            <Input
              type="number"
              step="any"
              value={form.cost_basis_usd}
              onChange={(e) => set("cost_basis_usd", e.target.value)}
              placeholder="4753"
            />
          </Field>
        )}

        {isEquity && (
          <Field label="Annual dividend / share" hint="In the trading currency (optional)">
            <Input
              type="number"
              step="any"
              min="0"
              value={form.annual_dividend_per_share}
              onChange={(e) => set("annual_dividend_per_share", e.target.value)}
              placeholder="e.g. 200"
            />
          </Field>
        )}

        {lockPosition && (
          <div className="col-span-2 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-xs text-muted">
            Quantity and cost basis are managed by the Buy/Sell ledger on this
            holding&rsquo;s page.
          </div>
        )}

        {isRE && (
          <Field label="Current value (USD)" hint="Manually appraised value">
            <Input
              type="number"
              step="any"
              value={form.manual_value_usd}
              onChange={(e) => set("manual_value_usd", e.target.value)}
              placeholder="948012"
            />
          </Field>
        )}

        {isRE && (
          <div className="col-span-2">
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Jakarta, Indonesia"
              />
            </Field>
          </div>
        )}

        <Field label="Acquisition date">
          <Input
            type="date"
            value={form.acquisition_date}
            onChange={(e) => set("acquisition_date", e.target.value)}
          />
        </Field>

        <div className="col-span-2">
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes…"
            />
          </Field>
        </div>

        {error && (
          <div className="col-span-2 text-sm text-loss">{error}</div>
        )}
      </div>
    </Modal>
  );
}
