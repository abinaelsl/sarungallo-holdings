export type MemberId = "dad" | "mom" | "son";
export type Strategy = "spending" | "reinvesting";
export type PrioritasProvider = "BNI" | "BRI";
export type Ticker = "BMRI" | "BBRI" | "BBNI";
export type TaxStatus = "EXEMPT" | "WARNING" | "DANGER";

export interface StockQuote {
  ticker: Ticker;
  name: string;
  /** Current price in IDR per share (editable). */
  price: number;
  /** Dividend per share (annual), IDR. */
  dps: number;
  peRatio: number;
}

export interface HoldingWeight {
  ticker: Ticker;
  weightPct: number;
}

export interface FamilyMember {
  id: MemberId;
  name: string;
  shortName: string;
  /** Core stock portfolio (FUM that earns the blended dividend yield). */
  portfolioCore: number;
  /** Surplus capital (Mom's digital-bank / non-core pile). */
  portfolioSurplus: number;
  broker: string;
  prioritas: PrioritasProvider[];
  strategy: Strategy;
  bankDeposits: number;
  /** Year the 3-year PP 9/2021 holding window started. */
  holdingWindowStartYear: number;
  sptFiled: boolean;
  dividendDeclaredAsInvested: boolean;
  brokerStatementsAttached: boolean;
}

export interface PerkDef {
  id: string;
  name: string;
  /** Annual value attribution per column key. */
  values: Record<string, { active: boolean; label: string; annualValue: number }>;
}

export interface GiftRecord {
  memberId: MemberId;
  amount: number;
  taxOwed: number;
  legalBasis: string;
  aktaHibah: boolean;
  sptReported: boolean;
}

export interface ComputedHolding {
  ticker: Ticker;
  name: string;
  weightPct: number;
  capital: number;
  price: number;
  shares: number;
  dps: number;
  annualDividend: number;
  dividendYield: number;
  peRatio: number;
}

export interface CashFlowMonth {
  month: number;
  startBalance: number;
  interest: number;
  withdrawal: number;
  endBalance: number;
}

export interface CashFlowResult {
  months: CashFlowMonth[];
  totalInterest: number;
  netAfterTax: number;
  yearEndSurplus: number;
  effectiveMonthlyBoost: number;
}

export interface MemberIncome {
  monthlyDividend: number;
  monthlyFloat: number;
  monthlyMilesValue: number;
  monthlyPerks: number;
  monthlySurplusYield: number;
  monthlyAllSource: number;
  annualDividend: number;
  annualPerks: number;
}
