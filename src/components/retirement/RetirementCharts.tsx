"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { formatRp } from "@/lib/format";

const TOOLTIP_STYLE =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg";

function RpTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={TOOLTIP_STYLE}>
      {label && <div className="mb-1 text-muted">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="tnum text-foreground">{formatRp(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const SOURCE_COLORS = {
  dividends: "#4f6f52",
  float: "#b08d3f",
  miles: "#566270",
  perks: "#7a2e2a",
  surplus: "#8c6b2e",
  reinvested: "#6b6258",
};

export function IncomeBySourceChart({
  data,
}: {
  data: Record<string, string | number>[];
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickFormatter={(v) => formatRp(v, { compact: true })}
            width={56}
          />
          <Tooltip content={<RpTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="dividends" name="Dividends" stackId="a" fill={SOURCE_COLORS.dividends} radius={[0, 0, 0, 0]} />
          <Bar dataKey="float" name="Float" stackId="a" fill={SOURCE_COLORS.float} />
          <Bar dataKey="miles" name="Miles" stackId="a" fill={SOURCE_COLORS.miles} />
          <Bar dataKey="perks" name="Perks" stackId="a" fill={SOURCE_COLORS.perks} />
          <Bar dataKey="surplus" name="Surplus yield" stackId="a" fill={SOURCE_COLORS.surplus} />
          <Bar dataKey="reinvested" name="Reinvested" stackId="a" fill={SOURCE_COLORS.reinvested} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const MEMBER_COLORS = {
  dad: "#b08d3f",
  mom: "#7a2e2a",
  son: "#4f6f52",
};

export function GrowthProjectionChart({
  data,
}: {
  data: Record<string, string | number>[];
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="years" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickFormatter={(v) => formatRp(v, { compact: true })}
            width={56}
          />
          <Tooltip content={<RpTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="dad" name="Dad" stroke={MEMBER_COLORS.dad} strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="mom" name="Mom" stroke={MEMBER_COLORS.mom} strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="son" name="Son" stroke={MEMBER_COLORS.son} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashFlowBalanceChart({
  data,
}: {
  data: { month: string; balance: number }[];
}) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickFormatter={(v) => formatRp(v, { compact: true })}
            width={56}
          />
          <Tooltip content={<RpTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="var(--gold)"
            fill="url(#balFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MilesCumulativeChart({
  data,
}: {
  data: { month: string; miles: number }[];
}) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={48} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className={TOOLTIP_STYLE}>
                  <div className="text-muted">{label}</div>
                  <div className="tnum text-foreground">
                    {Number(payload[0].value).toLocaleString("id-ID")} miles
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="miles"
            name="Miles"
            stroke="var(--gold)"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
