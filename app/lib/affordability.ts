// Singapore home affordability (TDSR / MSR / LTV). Pure, dependency-free.
//
// Every rule below is verified against MAS's published pages on the date in
// MAS_RULES_VERIFIED_ON. Sources:
//   TDSR calc:  https://www.mas.gov.sg/regulation/explainers/tdsr-for-property-loans/calculating-tdsr
//   LTV/tenure: https://www.mas.gov.sg/regulation/explainers/new-housing-loans/loan-tenure-and-loan-to-value-limits
//   MSR/TDSR:   https://www.mas.gov.sg/regulation/explainers/new-housing-loans/msr-and-tdsr-rules
//
// Verified facts:
//   - TDSR cap 55% of gross monthly income (loan reduced if exceeded).
//   - MSR cap 30% (HDB flats + ECs bought from a developer), on top of TDSR.
//   - Medium-term interest-rate FLOOR used for the calc: 4% residential (5% non-
//     residential). Banks use max(floor, thereafter rate). We default to 4%.
//   - Gross income excludes employer CPF; a minimum 30% haircut applies to
//     variable income (commission/bonus/allowance) and rental income.
//   - Bank-loan LTV: 75% / 45% / 35% for the 1st / 2nd / 3rd+ housing loan,
//     dropping to 55% / 25% / 15% if tenure > 30y (private) / 25y (HDB) or the
//     loan runs past age 65. Min cash downpayment 5%/10% (1st), else 25%.
//   - Loan tenure cap: 35y (private), 30y (HDB).

export const MAS_RULES_VERIFIED_ON = "2026-07-12";
export const TDSR_CAP = 0.55;
export const MSR_CAP = 0.30;
export const STRESS_RATE_RESIDENTIAL = 0.04; // medium-term interest-rate floor
export const VARIABLE_INCOME_HAIRCUT = 0.30;
export const MAS_TDSR_URL = "https://www.mas.gov.sg/regulation/explainers/tdsr-for-property-loans/calculating-tdsr";
export const MAS_LTV_URL = "https://www.mas.gov.sg/regulation/explainers/new-housing-loans/loan-tenure-and-loan-to-value-limits";

export type PropClass = "private" | "hdb_ec"; // hdb_ec: HDB flat or EC from developer (MSR applies)
export type LoanCount = 1 | 2 | 3; // number of the NEW loan: 1st, 2nd, 3rd+

export type AffordabilityInput = {
  fixedIncome: number; // gross monthly fixed income (before tax, excl. employer CPF)
  variableIncome: number; // gross monthly variable/rental income (30% haircut applied)
  monthlyDebts: number; // existing monthly debt obligations (car, other loans, min credit card, etc.)
  propClass: PropClass;
  loanCount: LoanCount;
  tenureYears: number;
  age: number;
  stressRate?: number; // fraction; defaults to the 4% residential floor
};

export type AffordabilityResult = {
  effectiveIncome: number;
  tenureYears: number; // clamped to the cap
  ltv: number; // fraction
  usedLowerLtv: boolean;
  minCashPct: number; // fraction of price
  stressRate: number;
  maxMonthlyRepayment: number; // binding of TDSR / MSR
  bindingConstraint: "TDSR" | "MSR";
  maxLoan: number;
  maxPropertyPrice: number;
  downpayment: number; // price - loan
  minCashDownpayment: number;
};

function tenureCap(propClass: PropClass): number {
  return propClass === "hdb_ec" ? 30 : 35;
}

// Standard LTV drops to the lower band if tenure exceeds 30y (private) / 25y (HDB)
// OR the loan runs past age 65.
function ltvFor(loanCount: LoanCount, propClass: PropClass, tenureYears: number, age: number) {
  const tenureTrigger = propClass === "hdb_ec" ? tenureYears > 25 : tenureYears > 30;
  const ageTrigger = age + tenureYears > 65;
  const lower = tenureTrigger || ageTrigger;
  const std: Record<LoanCount, number> = { 1: 0.75, 2: 0.45, 3: 0.35 };
  const low: Record<LoanCount, number> = { 1: 0.55, 2: 0.25, 3: 0.15 };
  const ltv = lower ? low[loanCount] : std[loanCount];
  // Min cash downpayment: 1st loan 5% (75% LTV) or 10% (55% LTV); 2nd/3rd 25%.
  const minCashPct = loanCount === 1 ? (lower ? 0.10 : 0.05) : 0.25;
  return { ltv, minCashPct, usedLowerLtv: lower };
}

// Present value of an annuity: max loan a given monthly repayment can service.
function annuityPV(monthly: number, monthlyRate: number, months: number): number {
  if (monthly <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return monthly * months;
  return (monthly * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate;
}

export function computeAffordability(i: AffordabilityInput): AffordabilityResult {
  const fixed = Math.max(0, i.fixedIncome || 0);
  const variable = Math.max(0, i.variableIncome || 0);
  const debts = Math.max(0, i.monthlyDebts || 0);
  const effectiveIncome = fixed + variable * (1 - VARIABLE_INCOME_HAIRCUT);

  const cap = tenureCap(i.propClass);
  const tenureYears = Math.min(Math.max(1, Math.round(i.tenureYears || cap)), cap);
  const stressRate = i.stressRate && i.stressRate > 0 ? i.stressRate : STRESS_RATE_RESIDENTIAL;

  const tdsrBudget = Math.max(0, TDSR_CAP * effectiveIncome - debts);
  const msrBudget = MSR_CAP * effectiveIncome; // MSR is on the property loan only
  const applyMsr = i.propClass === "hdb_ec";
  const maxMonthlyRepayment = applyMsr ? Math.min(tdsrBudget, msrBudget) : tdsrBudget;
  const bindingConstraint: "TDSR" | "MSR" = applyMsr && msrBudget < tdsrBudget ? "MSR" : "TDSR";

  const { ltv, minCashPct, usedLowerLtv } = ltvFor(i.loanCount, i.propClass, tenureYears, i.age || 30);

  const maxLoan = annuityPV(maxMonthlyRepayment, stressRate / 12, tenureYears * 12);
  const maxPropertyPrice = ltv > 0 ? maxLoan / ltv : 0;
  const downpayment = maxPropertyPrice - maxLoan;
  const minCashDownpayment = maxPropertyPrice * minCashPct;

  return {
    effectiveIncome,
    tenureYears,
    ltv,
    usedLowerLtv,
    minCashPct,
    stressRate,
    maxMonthlyRepayment,
    bindingConstraint,
    maxLoan: Math.floor(maxLoan),
    maxPropertyPrice: Math.floor(maxPropertyPrice),
    downpayment: Math.floor(downpayment),
    minCashDownpayment: Math.floor(minCashDownpayment),
  };
}

export function sgd(n: number): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 }).format(Math.round(n));
}
