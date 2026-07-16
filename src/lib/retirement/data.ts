import type {
  FamilyMember,
  GiftRecord,
  HoldingWeight,
  PerkDef,
  StockQuote,
} from "./types";

/** Target allocation — identical across members. */
export const TARGET_WEIGHTS: HoldingWeight[] = [
  { ticker: "BMRI", weightPct: 40 },
  { ticker: "BBRI", weightPct: 30 },
  { ticker: "BBNI", weightPct: 30 },
];

/**
 * Seed quotes. Prices/P/E are illustrative MVP defaults (editable in UI).
 * DPS chosen so weighted yield ≈ 11.36%:
 *   0.40×10.50% + 0.30×12.20% + 0.30×11.67% = 11.361%
 */
export const SEED_QUOTES: StockQuote[] = [
  {
    ticker: "BMRI",
    name: "Bank Mandiri",
    price: 5_250,
    dps: 551.25, // 10.50% yield
    peRatio: 9.8,
  },
  {
    ticker: "BBRI",
    name: "Bank BRI",
    price: 4_280,
    dps: 522.16, // 12.20% yield
    peRatio: 10.4,
  },
  {
    ticker: "BBNI",
    name: "Bank BNI",
    price: 4_650,
    dps: 542.655, // 11.67% yield
    peRatio: 8.9,
  },
];

export const BLENDED_YIELD_TARGET = 0.1136;
export const DIGITAL_BANK_RATE = 0.07;
export const MILES_PER_RP = 10_000;
export const MILE_VALUE_LOW = 150;
export const MILE_VALUE_HIGH = 200;
export const CC_FLOAT_DAYS = 45;
export const BANK_INTEREST_TAX = 0.2;

/** Prioritas annual perk value — Dad/Son BNI only. */
export const PERKS_BNI_ANNUAL = 9_700_000;
/** Mom BNI + BRI with overlap reduction. */
export const PERKS_MOM_ANNUAL = 15_200_000;

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "dad",
    name: "Dad",
    shortName: "Dad",
    portfolioCore: 1_000_000_000,
    portfolioSurplus: 0,
    broker: "BNI Sekuritas",
    prioritas: ["BNI"],
    strategy: "spending",
    bankDeposits: 80_000_000,
    holdingWindowStartYear: 2024,
    sptFiled: true,
    dividendDeclaredAsInvested: true,
    brokerStatementsAttached: true,
  },
  {
    id: "mom",
    name: "Mom",
    shortName: "Mom",
    portfolioCore: 2_000_000_000,
    portfolioSurplus: 1_500_000_000,
    broker: "BNI Sekuritas + BRI Danareksa",
    prioritas: ["BNI", "BRI"],
    strategy: "spending",
    bankDeposits: 120_000_000,
    holdingWindowStartYear: 2024,
    sptFiled: true,
    dividendDeclaredAsInvested: true,
    brokerStatementsAttached: true,
  },
  {
    id: "son",
    name: "Son",
    shortName: "Son",
    portfolioCore: 1_000_000_000,
    portfolioSurplus: 0,
    broker: "BNI Sekuritas",
    prioritas: ["BNI"],
    strategy: "reinvesting",
    bankDeposits: 50_000_000,
    holdingWindowStartYear: 2025,
    sptFiled: false,
    dividendDeclaredAsInvested: false,
    brokerStatementsAttached: true,
  },
];

export const GIFT_RECORD: GiftRecord = {
  memberId: "son",
  amount: 870_000_000,
  taxOwed: 0,
  legalBasis: "UU PPh pasal 4 ayat 3 — parent-to-child hibah",
  aktaHibah: true,
  sptReported: true,
};

/**
 * Perk matrix — columns: dad_bni, mom_bni, mom_bri, son_bni
 * Annual values from strategy notes; BRI reduced for overlap on Mom.
 */
export const PERKS_GRID: PerkDef[] = [
  {
    id: "fee_waiver",
    name: "Annual Fee Waiver",
    values: {
      dad_bni: { active: true, label: "✓ Rp3M", annualValue: 3_000_000 },
      mom_bni: { active: true, label: "✓ Rp3M", annualValue: 3_000_000 },
      mom_bri: { active: true, label: "✓ Rp2.5M", annualValue: 2_500_000 },
      son_bni: { active: true, label: "✓ Rp3M", annualValue: 3_000_000 },
    },
  },
  {
    id: "lounge",
    name: "Airport Lounge",
    values: {
      dad_bni: { active: true, label: "6 visits", annualValue: 1_200_000 },
      mom_bni: { active: true, label: "6 visits", annualValue: 1_200_000 },
      mom_bri: { active: true, label: "6 visits", annualValue: 800_000 },
      son_bni: { active: true, label: "6 visits", annualValue: 1_200_000 },
    },
  },
  {
    id: "travel_insurance",
    name: "Travel Insurance",
    values: {
      dad_bni: { active: true, label: "✓", annualValue: 2_500_000 },
      mom_bni: { active: true, label: "✓", annualValue: 2_500_000 },
      mom_bri: {
        active: true,
        label: "✓ (overlap)",
        annualValue: 500_000,
      },
      son_bni: { active: true, label: "✓", annualValue: 2_500_000 },
    },
  },
  {
    id: "health",
    name: "Health Screening",
    values: {
      dad_bni: { active: true, label: "✓", annualValue: 1_500_000 },
      mom_bni: { active: true, label: "✓", annualValue: 1_500_000 },
      mom_bri: { active: true, label: "✓", annualValue: 1_000_000 },
      son_bni: { active: true, label: "✓", annualValue: 1_500_000 },
    },
  },
  {
    id: "sos",
    name: "SOS / Emergency",
    values: {
      dad_bni: { active: true, label: "✓", annualValue: 1_500_000 },
      mom_bni: { active: true, label: "✓", annualValue: 1_500_000 },
      mom_bri: { active: true, label: "✓", annualValue: 700_000 },
      son_bni: { active: true, label: "✓", annualValue: 1_500_000 },
    },
  },
  {
    id: "concierge",
    name: "Concierge",
    values: {
      dad_bni: { active: true, label: "✓", annualValue: 0 },
      mom_bni: { active: true, label: "✓", annualValue: 0 },
      mom_bri: { active: true, label: "✓", annualValue: 0 },
      son_bni: { active: false, label: "—", annualValue: 0 },
    },
  },
];

export const PERK_COLUMNS = [
  { key: "dad_bni", label: "Dad (BNI)", memberId: "dad" as const },
  { key: "mom_bni", label: "Mom (BNI)", memberId: "mom" as const },
  { key: "mom_bri", label: "Mom (BRI)", memberId: "mom" as const },
  { key: "son_bni", label: "Son (BNI)", memberId: "son" as const },
];

/** Overlap notes shown on the perks page. */
export const PERK_OVERLAPS = [
  {
    perk: "Travel Insurance",
    note: "Mom’s BNI + BRI policies don’t stack — BRI value reduced to residual coverage only.",
  },
  {
    perk: "Airport Lounge",
    note: "Lounge visits are per-program; both can be used but value is not doubled for the same trip.",
  },
];
