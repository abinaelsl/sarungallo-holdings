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

// Supported equity exchanges. IDX trades in lots of 100 (IDR); US in shares (USD).
const EXCHANGES: { value: string; label: string; currency: string | null; lots: boolean }[] = [
  { value: "IDX", label: "IDX — Indonesia (IDR, lots)", currency: "IDR", lots: true },
  { value: "NASDAQ", label: "NASDAQ — US (USD, shares)", currency: "USD", lots: false },
  { value: "NYSE", label: "NYSE — US (USD, shares)", currency: "USD", lots: false },
  { value: "Other", label: "Other", currency: null, lots: false },
];

function exchangeMeta(value: string) {
  return EXCHANGES.find((e) => e.value === value);
}

/** Best-guess exchange for an existing/new equity, so the dropdown has a value. */
function normalizeExchange(h?: Holding | null): string {
  if (!h) return "IDX";
  const ex = (h.exchange || "").toUpperCase();
  if (ex === "IDX" || ex === "NASDAQ" || ex === "NYSE") return ex;
  if (h.ticker?.toUpperCase().endsWith(".JK") || (h.currency || "").toUpperCase() === "IDR")
    return "IDX";
  if ((h.currency || "").toUpperCase() === "USD") return "NASDAQ";
  return "Other";
}

function initialState(h?: Holding | null, presetClass?: AssetClass): FormState {
  const cls0 = (h?.asset_class ?? presetClass ?? "equity") as AssetClass;
  const eqExchange = normalizeExchange(h);
  const eqCurrency = exchangeMeta(eqExchange)?.currency ?? h?.currency ?? "USD";
  const eqUsesLots = cls0 === "equity" && exchangeMeta(eqExchange)?.lots === true;
  return {
    asset_class: cls0,
    name: h?.name ?? "",
    ticker: h?.ticker ?? "",
    sector: h?.sector ?? "",
    // Quantity is held in display units: lots for IDX equities, else shares.
    quantity:
      h?.quantity != null ? String(eqUsesLots ? h.quantity / 100 : h.quantity) : "",
    unit: h?.unit ?? "",
    currency: cls0 === "equity" ? eqCurrency : h?.currency ?? "USD",
    cost_basis_usd: h?.cost_basis_usd != null ? String(h.cost_basis_usd) : "",
    // Gold is entered as a per-unit cost (per gram/oz); derive it on edit.
    cost_per_unit_usd:
      h?.asset_class === "gold" && h?.cost_basis_usd != null && h?.quantity
        ? String(h.cost_basis_usd / h.quantity)
        : "",
    // Pre-fill the native average so a manual correction shows current values.
    open_price_native: h?.avg_cost_native != null ? String(h.avg_cost_native) : "",
    annual_dividend_per_share:
      h?.annual_dividend_per_share != null ? String(h.annual_dividend_per_share) : "",
    manual_value_usd: h?.manual_value_usd != null ? String(h.manual_value_usd) : "",
    exchange: cls0 === "equity" ? eqExchange : h?.exchange ?? "",
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
  // Manual position correction (rewrites the trade ledger to one opening lot).
  const [overridePos, setOverridePos] = useState(false);

  // Re-seed when the target holding changes.
  const [seededFor, setSeededFor] = useState(holding?.id ?? presetClass ?? "new");
  const seedKey = holding?.id ?? presetClass ?? "new";
  if (seedKey !== seededFor) {
    setForm(initialState(holding, presetClass));
    setSeededFor(seedKey);
    setOverridePos(false);
  }

  const cls = form.asset_class as AssetClass;
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isRE = cls === "real_estate";
  const isGold = cls === "gold";
  const isCrypto = cls === "crypto";
  const isEquity = cls === "equity";
  const isTradable = isEquity || isCrypto;
  // A tradable holding's position is ledger-driven — locked unless the user
  // opts into a manual correction.
  const lockPosition = isTradable && !!holding && !overridePos;
  const doReset = isTradable && !!holding && overridePos;

  // Equity exchange drives currency and whether the position is counted in lots.
  const exVal = isEquity ? form.exchange || "IDX" : form.exchange;
  const exMeta = exchangeMeta(exVal);
  const eqCurrency = isEquity ? exMeta?.currency ?? form.currency ?? "USD" : form.currency;
  const usesLots = isEquity && exMeta?.lots === true;

  // Gold cost is entered per unit (per gram/oz) and multiplied by quantity.
  const goldUnitLabel = form.unit === "g" ? "gram" : "oz";
  const goldTotalCost =
    (Number(form.quantity) || 0) * (Number(form.cost_per_unit_usd) || 0);

  const setExchange = (v: string) =>
    setForm((f) => {
      const meta = exchangeMeta(v);
      return { ...f, exchange: v, currency: meta?.currency ?? f.currency };
    });

  async function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    // Position stays ledger-managed unless the user opted into a manual fix.
    const lock = lockPosition;
    const payload: Record<string, unknown> = {
      asset_class: form.asset_class,
      name: form.name.trim(),
      ticker: form.ticker.trim() || null,
      sector: form.sector.trim() || null,
      unit: form.unit || null,
      currency: isEquity ? eqCurrency : form.currency || "USD",
      annual_dividend_per_share: form.annual_dividend_per_share
        ? Number(form.annual_dividend_per_share)
        : null,
      manual_value_usd: form.manual_value_usd ? Number(form.manual_value_usd) : null,
      exchange: isEquity ? exVal : form.exchange.trim() || null,
      location: form.location.trim() || null,
      acquisition_date: form.acquisition_date || null,
      notes: form.notes.trim() || null,
    };
    // Position fields are ledger-managed once a tradable holding exists, unless
    // the user is correcting them manually (doReset rewrites the ledger).
    if (!lock) {
      if (isEquity) {
        const rawQty = form.quantity ? Number(form.quantity) : 0;
        const shares = usesLots ? rawQty * 100 : rawQty;
        payload.quantity = shares > 0 ? shares : null;
        // Native opening price → backend seeds an opening trade & derives USD cost.
        if (form.open_price_native) {
          payload.open_price_native = Number(form.open_price_native);
        }
      } else if (isGold) {
        // Cost basis = quantity × cost per unit (grams or ounces).
        const q = form.quantity ? Number(form.quantity) : 0;
        const per = form.cost_per_unit_usd ? Number(form.cost_per_unit_usd) : 0;
        payload.quantity = q > 0 ? q : null;
        payload.cost_basis_usd = q > 0 && per > 0 ? q * per : 0;
      } else {
        payload.quantity = form.quantity ? Number(form.quantity) : null;
        payload.cost_basis_usd = form.cost_basis_usd ? Number(form.cost_basis_usd) : 0;
      }
      if (doReset) payload.reset_position = true;
    }
    const result = holding
      ? await updateHolding(holding.id, payload)
      : await createHolding(payload);
    setSaving(false);
    if (result) onClose();
    else setError("Could not save. Check the fields and try again.");
  }

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
          <Field
            label={
              isEquity
                ? usesLots
                  ? "Lots owned"
                  : "Shares owned"
                : isCrypto
                ? "Quantity (coins)"
                : isGold
                ? "Quantity"
                : "Quantity (shares)"
            }
            hint={usesLots ? "1 lot = 100 shares" : undefined}
          >
            <Input
              type="number"
              step={usesLots ? "1" : "any"}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder={
                isEquity
                  ? usesLots
                    ? "e.g. 100 lots"
                    : "e.g. 10.5 shares"
                  : isGold
                  ? form.unit === "g"
                    ? "e.g. 5"
                    : "e.g. 10"
                  : "0.5"
              }
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
            <Field label="Exchange" hint="Sets currency & lots vs. shares">
              <Select value={exVal} onChange={(e) => setExchange(e.target.value)}>
                {EXCHANGES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </Field>
            {exVal === "Other" && (
              <Field label="Trading currency">
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
            )}
          </>
        )}

        {isEquity && !lockPosition && (
          <Field
            label={`Avg. buy price (${eqCurrency} per share)`}
            hint="Seeds your opening position"
          >
            <Input
              type="number"
              step="any"
              min="0"
              value={form.open_price_native}
              onChange={(e) => set("open_price_native", e.target.value)}
              placeholder={usesLots ? "e.g. 7800" : "e.g. 150"}
            />
          </Field>
        )}

        {!lockPosition && isGold && (
          <Field
            label={`Cost per ${goldUnitLabel} (USD)`}
            hint={
              goldTotalCost > 0
                ? `= $${goldTotalCost.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })} total cost basis`
                : "Per-unit price × quantity"
            }
          >
            <Input
              type="number"
              step="any"
              min="0"
              value={form.cost_per_unit_usd}
              onChange={(e) => set("cost_per_unit_usd", e.target.value)}
              placeholder="e.g. 85"
            />
          </Field>
        )}

        {!lockPosition && !isEquity && !isGold && (
          <Field
            label="Cost basis (USD)"
            hint={isCrypto ? "Total invested — seeds an opening trade" : "Total amount invested"}
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
          <Field
            label={`Annual dividend / share (${eqCurrency})`}
            hint="Optional — used for yield"
          >
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

        {isTradable && !!holding && (
          <div className="col-span-2 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={overridePos}
                onChange={(e) => setOverridePos(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--gold)]"
              />
              <span className="text-xs text-muted">
                <span className="font-medium text-foreground">Correct position manually</span>
                <br />
                Normally the position is managed by the Buy/Sell ledger. Tick this to
                overwrite the {usesLots ? "lots" : "shares"} owned and average price —
                this resets the trade history to a single opening lot.
              </span>
            </label>
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
