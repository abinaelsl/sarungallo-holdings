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
  real_estate: "#5b8def",
  equity: "#c8a95b",
  gold: "#e0b84c",
  crypto: "#8b7cf0",
};

const SECTOR_PALETTE = [
  "#c8a95b",
  "#5b8def",
  "#3fb98a",
  "#8b7cf0",
  "#e0876a",
  "#56b6c2",
  "#d98ab5",
  "#9aa55b",
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
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="none"
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
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted">Total</span>
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
              <stop offset="0%" stopColor="#c8a95b" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#c8a95b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#232a3a" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "#8b93a7", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#232a3a" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#8b93a7", fontSize: 11 }}
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
            stroke="#c8a95b"
            strokeWidth={2}
            fill="url(#valueFill)"
            dot={data.length < 12 ? { r: 3, fill: "#c8a95b" } : false}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#5b6478"
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
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
                }}
              />
            </div>
          </div>
        );
      })}
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
