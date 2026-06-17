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
} from "recharts";
import { AssetClass, ASSET_CLASS_LABEL } from "@/lib/types";
import { usePortfolio } from "./PortfolioProvider";
import { formatIDR, formatUSD } from "@/lib/format";

export const CLASS_COLORS: Record<AssetClass, string> = {
  real_estate: "#7a2e2a", // burgundy
  equity: "#4f6f52", // forest
  gold: "#b08d3f", // brass-gold
  crypto: "#566270", // slate
};

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
          <CartesianGrid stroke="#e2d8c5" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "#6b6258", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#e2d8c5" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#6b6258", fontSize: 11 }}
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
            stroke="#a99b86"
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

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted">
      {label}
    </div>
  );
}
