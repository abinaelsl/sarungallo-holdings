"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  Legend,
} from "recharts";
import { AssetClass, ASSET_CLASS_LABEL } from "@/lib/types";
import { CLASS_COLORS } from "@/lib/colors";
import { usePortfolio } from "./PortfolioProvider";
import { formatIDR, formatUSD } from "@/lib/format";

export { CLASS_COLORS };

const SECTOR_PALETTE = [
  "#b08d3f", // gold
  "#7a2e2a", // burgundy
  "#4f6f52", // forest
  "#566270", // slate
  "#8c6b2e", // bronze
  "#a9743f", // copper
  "#6b6258", // taupe
  "#9a8c5a", // olive-gold
];

function useFmt() {
  const { currency, fxUsdIdr } = usePortfolio();
  return (usd: number) =>
    currency === "USD" ? formatUSD(usd, { compact: true }) : formatIDR(usd * fxUsdIdr);
}

/* ── Allocation donut by asset class ─────────────────────────────────── */
export function AllocationDonut({
  byClass,
}: {
  byClass: Record<AssetClass, number>;
}) {
  const fmt = useFmt();
  const data = (Object.keys(byClass) as AssetClass[])
    .map((k) => ({ key: k, name: ASSET_CLASS_LABEL[k], value: byClass[k] }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length)
    return <Empty label="No holdings yet" />;

  return (
    <div className="relative h-[260px]">
      <div
        className="h-full w-full"
        style={{ filter: "drop-shadow(0 8px 16px rgba(28,26,24,0.10))" }}
      >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            cornerRadius={4}
            stroke="none"
            animationDuration={650}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={CLASS_COLORS[d.key]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { name: string; value: number };
              return (
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                  <div className="text-foreground">{p.name}</div>
                  <div className="text-muted">
                    {fmt(p.value)} · {((p.value / total) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-wide text-muted">Total</span>
        <span className="font-serif text-lg text-foreground">{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ── Value over time ─────────────────────────────────────────────────── */
export function ValueOverTime({
  data,
}: {
  data: { t: string; value: number; cost: number }[];
}) {
  const { currency, fxUsdIdr } = usePortfolio();
  const conv = (v: number) => (currency === "USD" ? v : v * fxUsdIdr);
  const fmtAxis = (v: number) =>
    currency === "USD"
      ? formatUSD(v, { compact: true })
      : formatIDR(v * fxUsdIdr);

  if (data.length < 1) return <Empty label="Refresh to start tracking history" />;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b08d3f" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#b08d3f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) => fmtAxis(Number(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const value = payload.find((p) => p.dataKey === "value")?.value;
              const cost = payload.find((p) => p.dataKey === "cost")?.value;
              return (
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                  <div className="mb-1 text-muted">{label}</div>
                  <div className="text-gold">
                    Value:{" "}
                    {currency === "USD"
                      ? formatUSD(Number(value))
                      : formatIDR(Number(value) * fxUsdIdr)}
                  </div>
                  <div className="text-muted">
                    Cost:{" "}
                    {currency === "USD"
                      ? formatUSD(Number(cost))
                      : formatIDR(Number(cost) * fxUsdIdr)}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#b08d3f"
            strokeWidth={2.25}
            fill="url(#valueFill)"
            dot={data.length < 12 ? { r: 3, fill: "#b08d3f" } : false}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="var(--color-muted)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Sector breakdown bars ───────────────────────────────────────────── */
export function SectorBreakdown({
  bySector,
}: {
  bySector: Record<string, number>;
}) {
  const fmt = useFmt();
  const entries = Object.entries(bySector)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (!entries.length) return <Empty label="No sectors yet" />;

  return (
    <div className="space-y-3">
      {entries.map(([sector, value], i) => {
        const pct = total ? (value / total) * 100 : 0;
        return (
          <div key={sector}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground">{sector}</span>
              <span className="text-muted">
                {fmt(value)} · {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="bar-grow h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Sparkline (decorative hero trend, no axes) ──────────────────────── */
export function Sparkline({ data }: { data: { value: number }[] }) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b08d3f" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#b08d3f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="#b08d3f"
          strokeWidth={2}
          fill="url(#sparkFill)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Monthly performance: value bars + invested line (combo) ─────────── */
export type MonthPoint = {
  label: string;
  valueUsd: number;
  costUsd: number;
  valueIdr: number;
  fx: number;
};

export function MonthlyPerformance({ data }: { data: MonthPoint[] }) {
  const { currency } = usePortfolio();
  const isUsd = currency === "USD";
  if (!data.length)
    return <Empty label="Refresh prices to start capturing monthly history" />;

  const rows = data.map((d) => ({
    label: d.label,
    value: isUsd ? d.valueUsd : d.valueIdr,
    cost: isUsd ? d.costUsd : d.costUsd * d.fx,
  }));
  const fmtAxis = (v: number) => (isUsd ? formatUSD(v, { compact: true }) : formatIDR(v));
  const fmtFull = (v: number) => (isUsd ? formatUSD(v) : formatIDR(v));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={8}
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) => fmtAxis(Number(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-2)", opacity: 0.5 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const value = Number(payload.find((p) => p.dataKey === "value")?.value ?? 0);
              const cost = Number(payload.find((p) => p.dataKey === "cost")?.value ?? 0);
              const pnl = value - cost;
              return (
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                  <div className="mb-1 text-muted">{label}</div>
                  <div className="text-gold">Value: {fmtFull(value)}</div>
                  <div className="text-muted">Invested: {fmtFull(cost)}</div>
                  <div className={pnl >= 0 ? "text-gain" : "text-loss"}>
                    P/L: {fmtFull(pnl)}
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar
            dataKey="value"
            name="Value"
            fill="var(--color-gold)"
            radius={[5, 5, 0, 0]}
            maxBarSize={46}
          />
          <Line
            type="monotone"
            dataKey="cost"
            name="Invested"
            stroke="var(--color-burgundy)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── USD/IDR exchange rate over time ─────────────────────────────────── */
export function FxRateChart({ data }: { data: { label: string; fx: number }[] }) {
  const rows = data.filter((d) => d.fx > 0);
  if (rows.length < 1) return <Empty label="No exchange-rate history yet" />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7a2e2a" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#7a2e2a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={8}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const fx = Number(payload[0].value);
              return (
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
                  <div className="mb-1 text-muted">{label}</div>
                  <div className="text-foreground">
                    1 USD = Rp {Math.round(fx).toLocaleString("en-US")}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="fx"
            stroke="var(--color-burgundy)"
            strokeWidth={2.25}
            fill="url(#fxFill)"
            dot={rows.length < 12 ? { r: 3, fill: "#7a2e2a" } : false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted">
      {label}
    </div>
  );
}
