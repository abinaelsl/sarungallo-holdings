/**
 * Multi-provider live pricing — keyless-first for reliability.
 *
 *   FX     → open.er-api.com           (keyless, one call, all currencies)
 *   Crypto → api.coingecko.com         (keyless)
 *   Gold   → api.gold-api.com          (keyless, spot USD / troy ounce)
 *   Stocks → Twelve Data (free key)    (reliable IDX/global), Yahoo fallback
 *
 * Only stocks benefit from an API key. Add TWELVEDATA_API_KEY for dependable
 * IDX equity prices; without it the app falls back to Yahoo (best effort).
 */

import { Holding } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const GRAMS_PER_TROY_OUNCE = 31.1034768;

export interface PricedHolding {
  priceNative: number;
  currency: string;
  pricePerUnitUsd: number;
  valueUsd: number;
}

async function getJson(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

/* ── FX ──────────────────────────────────────────────────────────────── */
/** Rates relative to USD: rates[CUR] = units of CUR per 1 USD. */
export async function getFxRates(): Promise<Record<string, number>> {
  try {
    const j = await getJson("https://open.er-api.com/v6/latest/USD");
    if (j?.rates && typeof j.rates.IDR === "number") {
      return j.rates as Record<string, number>;
    }
  } catch {
    /* fall through */
  }
  // Last-resort fallback so the app keeps working.
  return { USD: 1, IDR: 16500 };
}

/**
 * Convert a native-currency amount to USD.
 * Returns null when the FX rate is missing so callers can fail the holding
 * instead of silently treating EUR/GBP/etc. as USD 1:1.
 */
export function nativeToUsd(
  amount: number,
  currency: string,
  rates: Record<string, number>,
): number | null {
  const cur = (currency || "USD").toUpperCase();
  if (cur === "USD") return amount;
  const rate = rates[cur];
  if (!rate || rate <= 0) return null;
  return amount / rate;
}

/* ── Gold (spot, USD per troy ounce) ─────────────────────────────────── */
export async function getGoldUsdPerOunce(): Promise<number | null> {
  try {
    const j = await getJson("https://api.gold-api.com/price/XAU");
    if (typeof j?.price === "number") return j.price;
  } catch {
    /* ignore */
  }
  return null;
}

/* ── Crypto (CoinGecko) ──────────────────────────────────────────────── */
const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  USDT: "tether",
  USDC: "usd-coin",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  DOT: "polkadot",
  LTC: "litecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  TRX: "tron",
  TON: "the-open-network",
  SHIB: "shiba-inu",
  ATOM: "cosmos",
  XLM: "stellar",
  NEAR: "near",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  APT: "aptos",
};

/** Normalize a crypto ticker like "BTC-USD" or "btc" → base symbol "BTC". */
function cryptoBase(ticker: string): string {
  const t = ticker.toUpperCase().trim();
  // Known full symbols must resolve before stripping quote suffixes —
  // `/[-/]?USDT?$/i` would otherwise turn "USDT" / "USD" into "".
  if (COIN_IDS[t]) return t;
  const stripped = t.replace(/[-/](USD|USDT|USDC)$/i, "").trim();
  return stripped || t;
}

async function resolveCoinId(base: string): Promise<string | null> {
  if (!base) return null;
  if (COIN_IDS[base]) return COIN_IDS[base];
  try {
    const j = await getJson(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(base)}`,
    );
    const hit = j?.coins?.find(
      (c: { symbol: string; id: string }) => c.symbol?.toUpperCase() === base,
    );
    // Never fall back to coins[0] — that silently prices the wrong asset.
    return hit?.id ?? null;
  } catch {
    return null;
  }
}

/** Run async work over items with a fixed concurrency limit. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function fetchCryptoPrices(
  cryptos: Holding[],
): Promise<Map<string, { price: number; currency: string }>> {
  const out = new Map<string, { price: number; currency: string }>();
  if (!cryptos.length) return out;

  const idByHolding = new Map<string, string>();
  const ids = new Set<string>();
  const bases = cryptos.map((h) => ({ h, base: cryptoBase(h.ticker || h.name) }));
  // Resolve unknown symbols in parallel (capped) instead of N sequential searches.
  const resolved = await mapPool(bases, 4, async ({ h, base }) => ({
    h,
    id: await resolveCoinId(base),
  }));
  for (const { h, id } of resolved) {
    if (id) {
      idByHolding.set(h.id, id);
      ids.add(id);
    }
  }
  if (!ids.size) return out;

  try {
    const j = await getJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${[...ids].join(
        ",",
      )}&vs_currencies=usd`,
    );
    for (const h of cryptos) {
      const id = idByHolding.get(h.id);
      const price = id ? j?.[id]?.usd : undefined;
      if (typeof price === "number") out.set(h.id, { price, currency: "USD" });
    }
  } catch {
    /* ignore */
  }
  return out;
}

/* ── Stocks (Twelve Data → Yahoo fallback) ───────────────────────────── */
const SUFFIX_EXCHANGE: Record<string, string> = {
  JK: "IDX",
  L: "LSE",
  SI: "SGX",
  T: "Tokyo",
  HK: "HKEX",
  AX: "ASX",
  TO: "TSX",
  PA: "Euronext",
  DE: "XETRA",
};

function splitSymbol(ticker: string): { symbol: string; exchange?: string } {
  const t = ticker.trim().toUpperCase();
  const dot = t.lastIndexOf(".");
  if (dot > 0) {
    const suffix = t.slice(dot + 1);
    if (suffix === "US") return { symbol: t.slice(0, dot) };
    const exchange = SUFFIX_EXCHANGE[suffix];
    if (exchange) return { symbol: t.slice(0, dot), exchange };
  }
  return { symbol: t };
}

/* ── TradingView public scanner (keyless, works from datacenter IPs) ──── */
// Maps a ticker suffix to a TradingView exchange prefix.
const SUFFIX_TV_EXCHANGE: Record<string, string> = {
  JK: "IDX",
  L: "LSE",
  SI: "SGX",
  T: "TSE",
  HK: "HKEX",
  AX: "ASX",
  TO: "TSX",
  DE: "XETR",
  PA: "EURONEXT",
};

/** Convert a ticker like "BBCA.JK" → "IDX:BBCA". Returns null if no mapping. */
function toTradingViewSymbol(ticker: string): string | null {
  const t = ticker.trim().toUpperCase();
  const dot = t.lastIndexOf(".");
  if (dot > 0) {
    const ex = SUFFIX_TV_EXCHANGE[t.slice(dot + 1)];
    if (ex) return `${ex}:${t.slice(0, dot)}`;
  }
  return null;
}

async function fetchTradingView(
  equities: Holding[],
): Promise<Map<string, { price: number; currency: string }>> {
  const out = new Map<string, { price: number; currency: string }>();
  await Promise.all(
    equities.map(async (h) => {
      if (!h.ticker) return;
      const tv = toTradingViewSymbol(h.ticker);
      if (!tv) return;
      try {
        const j = await getJson(
          `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(
            tv,
          )}&fields=close,currency&no_404=true`,
        );
        if (typeof j?.close === "number" && j.close > 0) {
          out.set(h.id, { price: j.close, currency: j.currency || h.currency || "USD" });
        }
      } catch {
        /* ignore — other providers will try */
      }
    }),
  );
  return out;
}

async function fetchStocksTwelveData(
  equities: Holding[],
  apiKey: string,
): Promise<Map<string, { price: number; currency: string }>> {
  const out = new Map<string, { price: number; currency: string }>();

  // Group by exchange so each request can share one exchange parameter.
  const groups = new Map<string, Holding[]>();
  for (const h of equities) {
    if (!h.ticker) continue;
    const { exchange } = splitSymbol(h.ticker);
    const key = exchange ?? "_US";
    const arr = groups.get(key) ?? [];
    arr.push(h);
    groups.set(key, arr);
  }

  for (const [exKey, holdings] of groups) {
    const bySymbol = new Map<string, Holding>();
    for (const h of holdings) {
      const { symbol } = splitSymbol(h.ticker!);
      bySymbol.set(symbol, h);
    }
    const symbols = [...bySymbol.keys()].join(",");
    const exParam = exKey === "_US" ? "" : `&exchange=${encodeURIComponent(exKey)}`;
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
      symbols,
    )}${exParam}&apikey=${apiKey}`;
    try {
      const j = await getJson(url);
      // Normalize: single symbol → object; multiple → keyed by symbol.
      const items: Record<string, unknown> =
        j && typeof j === "object" && "symbol" in j
          ? { [(j as { symbol: string }).symbol]: j }
          : (j as Record<string, unknown>);
      for (const [sym, holding] of bySymbol) {
        const q = items?.[sym] as
          | { close?: string; price?: string; currency?: string }
          | undefined;
        const raw = q?.close ?? q?.price;
        const price = raw != null ? parseFloat(String(raw)) : NaN;
        if (!Number.isNaN(price) && price > 0) {
          out.set(holding.id, {
            price,
            currency: q?.currency || holding.currency || "USD",
          });
        }
      }
    } catch {
      /* group failed → leave for Yahoo fallback */
    }
  }
  return out;
}

async function fetchYahooChart(
  symbol: string,
): Promise<{ price: number; currency: string } | null> {
  for (const base of [
    "https://query1.finance.yahoo.com/v8/finance/chart/",
    "https://query2.finance.yahoo.com/v8/finance/chart/",
  ]) {
    try {
      const j = await getJson(
        `${base}${encodeURIComponent(symbol)}?range=5d&interval=1d`,
      );
      const meta = j?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? meta?.chartPreviousClose;
      if (typeof price === "number")
        return { price, currency: meta.currency ?? "USD" };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function fetchStockPrices(
  equities: Holding[],
): Promise<Map<string, { price: number; currency: string }>> {
  // 1) TradingView first — keyless, covers IDX + most exchanges, works from servers.
  const out = await fetchTradingView(equities);

  // 2) Twelve Data for anything still missing (good for US symbols).
  const apiKey = process.env.TWELVEDATA_API_KEY;
  const missing = equities.filter((h) => !out.has(h.id));
  if (apiKey && missing.length) {
    const td = await fetchStocksTwelveData(missing, apiKey);
    for (const [k, v] of td) out.set(k, v);
  }

  // 3) Yahoo as last resort — parallel with a small concurrency cap.
  const yahooMissing = equities.filter((h) => !out.has(h.id) && h.ticker);
  await mapPool(yahooMissing, 4, async (h) => {
    const q = await fetchYahooChart(h.ticker!);
    if (q) out.set(h.id, q);
  });
  return out;
}

/* ── Orchestrator ────────────────────────────────────────────────────── */
export interface PricePortfolioResult {
  rates: Record<string, number>;
  usdIdr: number;
  priced: Map<string, PricedHolding>;
  failures: string[];
}

export async function priceHoldings(
  holdings: Holding[],
): Promise<PricePortfolioResult> {
  const market = holdings.filter((h) => h.asset_class !== "real_estate");
  const equities = market.filter((h) => h.asset_class === "equity");
  const cryptos = market.filter((h) => h.asset_class === "crypto");
  const golds = market.filter((h) => h.asset_class === "gold");

  const [rates, stockMap, cryptoMap, goldOz] = await Promise.all([
    getFxRates(),
    fetchStockPrices(equities),
    fetchCryptoPrices(cryptos),
    golds.length ? getGoldUsdPerOunce() : Promise.resolve(null),
  ]);

  const usdIdr = rates.IDR ?? 16500;
  const priced = new Map<string, PricedHolding>();
  const failures: string[] = [];

  for (const h of market) {
    let priceNative: number | undefined;
    let currency = h.currency || "USD";

    if (h.asset_class === "equity") {
      const q = stockMap.get(h.id);
      if (q) {
        priceNative = q.price;
        currency = q.currency;
      }
    } else if (h.asset_class === "crypto") {
      const q = cryptoMap.get(h.id);
      if (q) {
        priceNative = q.price;
        currency = "USD";
      }
    } else if (h.asset_class === "gold") {
      if (goldOz != null) {
        priceNative = goldOz; // USD per troy ounce
        currency = "USD";
      }
    }

    if (priceNative == null) {
      failures.push(`${h.name}${h.ticker ? ` (${h.ticker})` : ""}`);
      continue;
    }

    // Gold quote is USD/oz; when quantity is in grams, persist unit prices per gram
    // so quantity * current_price_usd is always correct later.
    const goldInGrams =
      h.asset_class === "gold" &&
      !!h.unit &&
      h.unit.toLowerCase().startsWith("g");

    let unitNative = priceNative;
    if (goldInGrams) {
      unitNative = priceNative / GRAMS_PER_TROY_OUNCE;
    }

    const pricePerUnitUsd = nativeToUsd(unitNative, currency, rates);
    if (pricePerUnitUsd == null) {
      failures.push(
        `${h.name}${h.ticker ? ` (${h.ticker})` : ""} — missing FX for ${currency}`,
      );
      continue;
    }

    const qty = h.quantity ?? 0;
    priced.set(h.id, {
      priceNative: unitNative,
      currency,
      pricePerUnitUsd,
      valueUsd: qty * pricePerUnitUsd,
    });
  }

  return { rates, usdIdr, priced, failures };
}
