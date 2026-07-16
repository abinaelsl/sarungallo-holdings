export function formatUSD(value: number | null | undefined, opts?: { compact?: boolean }): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 4 : 2,
  }).format(value);
}

export function formatIDR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  let scaled = value;
  let suffix = "";
  if (abs >= 1_000_000_000_000) {
    scaled = value / 1_000_000_000_000;
    suffix = "T";
  } else if (abs >= 1_000_000_000) {
    scaled = value / 1_000_000_000;
    suffix = "B";
  } else if (abs >= 1_000_000) {
    scaled = value / 1_000_000;
    suffix = "M";
  }
  if (suffix) {
    return `Rp ${scaled.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  }
  return `Rp ${Math.round(value).toLocaleString("en-US")}`;
}

/** Full Indonesian rupiah: Rp1.234.567 (no decimals unless requested). */
export function formatRp(
  value: number | null | undefined,
  opts?: { decimals?: number; compact?: boolean },
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (opts?.compact) return formatIDR(value).replace("Rp ", "Rp");
  const decimals = opts?.decimals ?? 0;
  return `Rp${value.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Percentage to exactly 2 decimal places (no forced + sign). */
export function formatPct2(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

/** Format a value in its native trading currency (IDR uses id-ID grouping). */
export function formatNative(
  value: number | null | undefined,
  currency: string,
  opts?: { compact?: boolean; maxDigits?: number },
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const cur = (currency || "USD").toUpperCase();
  if (cur === "USD") return formatUSD(value, { compact: opts?.compact });
  if (cur === "IDR") {
    if (opts?.compact) return formatIDR(value);
    return `Rp ${value.toLocaleString("id-ID", {
      maximumFractionDigits: opts?.maxDigits ?? 2,
    })}`;
  }
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: opts?.maxDigits ?? 2,
  })} ${cur}`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatSignedUSD(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatUSD(Math.abs(value))}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function gainClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-muted";
  return value > 0 ? "text-gain" : "text-loss";
}
