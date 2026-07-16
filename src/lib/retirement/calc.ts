import {
  BANK_INTEREST_TAX,
  BLENDED_YIELD_TARGET,
  CC_FLOAT_DAYS,
  DIGITAL_BANK_RATE,
  FAMILY_MEMBERS,
  MILE_VALUE_HIGH,
  MILE_VALUE_LOW,
  MILES_PER_RP,
  PERKS_BNI_ANNUAL,
  PERKS_GRID,
  PERKS_MOM_ANNUAL,
  SEED_QUOTES,
  TARGET_WEIGHTS,
} from "./data";
import type {
  CashFlowMonth,
  CashFlowResult,
  ComputedHolding,
  FamilyMember,
  MemberId,
  MemberIncome,
  StockQuote,
  TaxStatus,
} from "./types";

/* ── Blended dividend yield ─────────────────────────────────────────── */
export function holdingYield(quote: StockQuote): number {
  if (!quote.price || quote.price <= 0) return 0;
  return quote.dps / quote.price;
}

export function blendedYield(quotes: StockQuote[] = SEED_QUOTES): number {
  const byTicker = Object.fromEntries(quotes.map((q) => [q.ticker, q]));
  let weighted = 0;
  for (const w of TARGET_WEIGHTS) {
    const q = byTicker[w.ticker];
    if (!q) continue;
    weighted += (w.weightPct / 100) * holdingYield(q);
  }
  return weighted;
}

/* ── Holdings table ─────────────────────────────────────────────────── */
export function computeHoldings(
  portfolioCore: number,
  quotes: StockQuote[] = SEED_QUOTES,
): ComputedHolding[] {
  const byTicker = Object.fromEntries(quotes.map((q) => [q.ticker, q]));
  return TARGET_WEIGHTS.map((w) => {
    const q = byTicker[w.ticker]!;
    const capital = portfolioCore * (w.weightPct / 100);
    const price = q.price;
    const shares = price > 0 ? capital / price : 0;
    const dps = q.dps;
    const annualDividend = shares * dps;
    const dividendYield = holdingYield(q);
    return {
      ticker: w.ticker,
      name: q.name,
      weightPct: w.weightPct,
      capital,
      price,
      shares,
      dps,
      annualDividend,
      dividendYield,
      peRatio: q.peRatio,
    };
  });
}

export function annualDividendFromHoldings(holdings: ComputedHolding[]): number {
  return holdings.reduce((s, h) => s + h.annualDividend, 0);
}

/* ── Digital bank float (12-month simulation) ───────────────────────── */
export function simulateCashFlow(
  annualDividend: number,
  bankRatePct: number = DIGITAL_BANK_RATE * 100,
  monthlyWithdrawal?: number,
): CashFlowResult {
  const withdrawal =
    monthlyWithdrawal != null && monthlyWithdrawal > 0
      ? monthlyWithdrawal
      : annualDividend / 12;
  const monthlyRate = bankRatePct / 100 / 12;
  const months: CashFlowMonth[] = [];
  let balance = annualDividend;
  let totalInterest = 0;

  for (let month = 1; month <= 12; month++) {
    const startBalance = balance;
    const interest = startBalance * monthlyRate;
    const endBalance = startBalance + interest - withdrawal;
    totalInterest += interest;
    months.push({
      month,
      startBalance,
      interest,
      withdrawal,
      endBalance,
    });
    balance = endBalance;
  }

  const netAfterTax = totalInterest * (1 - BANK_INTEREST_TAX);
  const yearEndSurplus = balance;
  const effectiveMonthlyBoost = netAfterTax / 12;

  return {
    months,
    totalInterest,
    netAfterTax,
    yearEndSurplus,
    effectiveMonthlyBoost,
  };
}

/** Compound year-end surplus into next year's pool for N years. */
export function simulateCompoundSurplus(
  annualDividend: number,
  bankRatePct: number,
  monthlyWithdrawal: number,
  years: number,
): { year: number; startingPool: number; surplus: number; interest: number }[] {
  const rows: {
    year: number;
    startingPool: number;
    surplus: number;
    interest: number;
  }[] = [];
  let pool = annualDividend;
  for (let y = 1; y <= years; y++) {
    const sim = simulateCashFlow(pool, bankRatePct, monthlyWithdrawal);
    rows.push({
      year: y,
      startingPool: pool,
      surplus: sim.yearEndSurplus,
      interest: sim.totalInterest,
    });
    pool = annualDividend + Math.max(0, sim.yearEndSurplus);
  }
  return rows;
}

/* ── Compound portfolio projection ──────────────────────────────────── */
export function compoundProjection(
  presentValue: number,
  yieldRate: number = BLENDED_YIELD_TARGET,
  years: number[],
): { years: number; fv: number; annualDividend: number }[] {
  return years.map((y) => {
    const fv = presentValue * Math.pow(1 + yieldRate, y);
    return { years: y, fv, annualDividend: fv * yieldRate };
  });
}

/* ── Tax coverage ───────────────────────────────────────────────────── */
export function taxCoverageRatio(
  portfolioMarketValue: number,
  bankDeposits: number,
  annualDividend: number,
): number {
  if (annualDividend <= 0) return Infinity;
  return (portfolioMarketValue + bankDeposits) / annualDividend;
}

export function taxStatusFromCoverage(coverage: number): TaxStatus {
  if (coverage < 1.0) return "DANGER";
  if (coverage < 1.5) return "WARNING";
  return "EXEMPT";
}

export function holdingWindowRemaining(
  startYear: number,
  asOfYear: number = new Date().getFullYear(),
  asOfMonth: number = new Date().getMonth() + 1,
): { yearsLeft: number; monthsLeft: number; expiringSoon: boolean } {
  const endYear = startYear + 3;
  const endMonth = 12; // assume calendar-year window end
  const monthsLeft = (endYear - asOfYear) * 12 + (endMonth - asOfMonth);
  const yearsLeft = Math.max(0, monthsLeft / 12);
  return {
    yearsLeft,
    monthsLeft: Math.max(0, monthsLeft),
    expiringSoon: monthsLeft > 0 && monthsLeft <= 6,
  };
}

/* ── CC float + KrisFlyer miles ─────────────────────────────────────── */
export function ccFloatInterest(
  monthlySpend: number,
  bankRate: number = DIGITAL_BANK_RATE,
): number {
  const dailyFloat = monthlySpend * (CC_FLOAT_DAYS / 30);
  return dailyFloat * bankRate;
}

export function krisFlyerMiles(
  annualSpend: number,
  mileValueLow: number = MILE_VALUE_LOW,
  mileValueHigh: number = MILE_VALUE_HIGH,
): {
  annualMiles: number;
  rupiahLow: number;
  rupiahHigh: number;
} {
  const annualMiles = annualSpend / MILES_PER_RP;
  return {
    annualMiles,
    rupiahLow: annualMiles * mileValueLow,
    rupiahHigh: annualMiles * mileValueHigh,
  };
}

/* ── Perks ──────────────────────────────────────────────────────────── */
export function annualPerksForMember(memberId: MemberId): number {
  if (memberId === "mom") return PERKS_MOM_ANNUAL;
  return PERKS_BNI_ANNUAL;
}

export function perkColumnTotal(columnKey: string): number {
  return PERKS_GRID.reduce(
    (s, perk) => s + (perk.values[columnKey]?.annualValue ?? 0),
    0,
  );
}

/* ── Member income stack ────────────────────────────────────────────── */
export function memberIncome(
  member: FamilyMember,
  quotes: StockQuote[] = SEED_QUOTES,
  opts?: {
    mileValue?: number;
    bankRate?: number;
  },
): MemberIncome {
  const holdings = computeHoldings(member.portfolioCore, quotes);
  const annualDividend = annualDividendFromHoldings(holdings);
  const monthlyDividend = annualDividend / 12;

  // Float interest from parking annual dividend in digital bank (spenders only).
  const floatSim =
    member.strategy === "spending"
      ? simulateCashFlow(annualDividend, (opts?.bankRate ?? DIGITAL_BANK_RATE) * 100)
      : null;
  const monthlyFloat = floatSim ? floatSim.netAfterTax / 12 : 0;

  // Miles on spending of monthly dividend (spenders) or projected spend = div/12.
  const monthlySpend = monthlyDividend;
  const miles = krisFlyerMiles(monthlySpend * 12, opts?.mileValue, opts?.mileValue);
  const monthlyMilesValue =
    member.strategy === "spending" ? (miles.rupiahLow + miles.rupiahHigh) / 2 / 12 : 0;

  const annualPerks = annualPerksForMember(member.id);
  const monthlyPerks = annualPerks / 12;

  // Mom surplus parked at digital bank rate.
  const monthlySurplusYield =
    member.portfolioSurplus > 0
      ? (member.portfolioSurplus * (opts?.bankRate ?? DIGITAL_BANK_RATE)) / 12
      : 0;

  // CC float interest (annual → monthly), spenders only.
  const monthlyCcFloat =
    member.strategy === "spending"
      ? ccFloatInterest(monthlySpend, opts?.bankRate ?? DIGITAL_BANK_RATE) / 12
      : 0;

  const monthlyAllSource =
    monthlyDividend +
    monthlyFloat +
    monthlyMilesValue +
    monthlyPerks +
    monthlySurplusYield +
    monthlyCcFloat;

  return {
    monthlyDividend,
    monthlyFloat: monthlyFloat + monthlyCcFloat,
    monthlyMilesValue,
    monthlyPerks,
    monthlySurplusYield,
    monthlyAllSource,
    annualDividend,
    annualPerks,
  };
}

export function getMember(id: MemberId): FamilyMember | undefined {
  return FAMILY_MEMBERS.find((m) => m.id === id);
}

export function familyTotals(quotes: StockQuote[] = SEED_QUOTES) {
  const yieldRate = blendedYield(quotes);
  let totalFum = 0;
  let totalAnnualDiv = 0;

  const byMember = FAMILY_MEMBERS.map((m) => {
    const income = memberIncome(m, quotes);
    totalFum += m.portfolioCore + m.portfolioSurplus;
    totalAnnualDiv += income.annualDividend;
    return { member: m, income };
  });

  // Household income: spenders' all-source take-home + reinvestor dividend
  // capacity (earned even when ploughed back) + everyone's perks.
  const householdMonthly = byMember.reduce((s, b) => {
    if (b.member.strategy === "spending") return s + b.income.monthlyAllSource;
    return s + b.income.monthlyDividend + b.income.monthlyPerks;
  }, 0);

  return {
    totalFum,
    totalAnnualDiv,
    blendedYield: yieldRate,
    householdMonthly,
    byMember,
  };
}

/** Monthly income by source × member — for stacked bar chart. */
export function incomeBySourceChart(quotes: StockQuote[] = SEED_QUOTES) {
  return FAMILY_MEMBERS.map((m) => {
    const inc = memberIncome(m, quotes);
    if (m.strategy === "reinvesting") {
      return {
        name: m.shortName,
        dividends: 0,
        float: 0,
        miles: 0,
        perks: inc.monthlyPerks,
        surplus: 0,
        reinvested: inc.monthlyDividend,
      };
    }
    return {
      name: m.shortName,
      dividends: inc.monthlyDividend,
      float: inc.monthlyFloat,
      miles: inc.monthlyMilesValue,
      perks: inc.monthlyPerks,
      surplus: inc.monthlySurplusYield,
      reinvested: 0,
    };
  });
}

/** Growth projection series for line chart. */
export function growthChartData(
  quotes: StockQuote[] = SEED_QUOTES,
  yearMarks: number[] = [0, 5, 10, 15, 20],
) {
  const y = blendedYield(quotes);
  return yearMarks.map((years) => {
    const row: Record<string, number | string> = { years: `${years}y` };
    for (const m of FAMILY_MEMBERS) {
      const fv = m.portfolioCore * Math.pow(1 + y, years);
      row[m.id] = fv;
    }
    return row;
  });
}

/** Income waterfall steps for member detail. */
export function incomeWaterfall(member: FamilyMember, quotes: StockQuote[] = SEED_QUOTES) {
  const inc = memberIncome(member, quotes);
  const floatSim =
    member.strategy === "spending"
      ? simulateCashFlow(inc.annualDividend)
      : null;

  return [
    { step: "Gross annual dividend", value: inc.annualDividend, kind: "gross" as const },
    {
      step: "÷ 12 → monthly dividend",
      value: inc.monthlyDividend,
      kind: "base" as const,
    },
    {
      step: "Digital bank float (net)",
      value: floatSim ? floatSim.netAfterTax / 12 : 0,
      kind: "add" as const,
    },
    {
      step: "CC miles value",
      value: inc.monthlyMilesValue,
      kind: "add" as const,
    },
    {
      step: "CC float interest",
      value: Math.max(0, inc.monthlyFloat - (floatSim ? floatSim.netAfterTax / 12 : 0)),
      kind: "add" as const,
    },
    {
      step: "Prioritas perks",
      value: inc.monthlyPerks,
      kind: "add" as const,
    },
    {
      step: "Surplus yield",
      value: inc.monthlySurplusYield,
      kind: "add" as const,
    },
    {
      step: "Net monthly take-home",
      value: member.strategy === "reinvesting" ? 0 : inc.monthlyAllSource,
      kind: "net" as const,
    },
  ];
}
