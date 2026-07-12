// Seller net-proceeds: how much cash a seller actually walks away with after a
// sale. Pure, dependency-free, and composes the IRAS-verified SSD calculation
// from ./stamp-duty (single source of truth for the tax figure).
//
// Cash proceeds = sale price
//   - agent commission (+ GST if the agency is GST-registered)
//   - Seller's Stamp Duty (if sold within the holding period)
//   - outstanding home loan redeemed
//   - CPF refund (principal used + accrued interest, back to your CPF OA)
//   - legal / conveyancing fees
//
// The CPF refund does not vanish (it returns to your own CPF Ordinary Account),
// but it reduces the CASH in hand, so sellers routinely want it in the figure.

import { computeSSD, sgd, type SsdResult } from "./stamp-duty";

export { sgd };

export const GST_PCT = 0.09;

// Market-norm commission rates by property type (NOT fixed by law; CEA states
// commission is negotiable). Mirrors /tools/commission-calculator.
export type SaleType = "HDB" | "CONDO" | "LANDED" | "EC";
export const COMMISSION_DEFAULT_PCT: Record<SaleType, number> = {
  HDB: 1,
  CONDO: 2,
  LANDED: 2,
  EC: 2,
};

export type NetProceedsInput = {
  salePrice: number;
  commissionPct: number;
  gst: boolean;
  outstandingLoan: number;
  cpfRefund: number;
  legalFees: number;
  // SSD inputs (residential). Leave dates blank if not applicable / not sure.
  purchaseDate: string;
  saleDate: string;
};

export type NetProceedsRow = { label: string; amount: number; note?: string };

export type NetProceedsResult = {
  salePrice: number;
  commission: number;
  gstAmount: number;
  ssd: SsdResult;
  outstandingLoan: number;
  cpfRefund: number;
  legalFees: number;
  totalDeductions: number;
  netProceeds: number;
  rows: NetProceedsRow[]; // ordered deduction breakdown
};

export function computeNetProceeds(i: NetProceedsInput): NetProceedsResult {
  const salePrice = Math.max(0, i.salePrice || 0);
  const commission = salePrice * (Math.max(0, i.commissionPct || 0) / 100);
  const gstAmount = i.gst ? commission * GST_PCT : 0;
  const ssd = computeSSD(salePrice, i.purchaseDate, i.saleDate);
  const outstandingLoan = Math.max(0, i.outstandingLoan || 0);
  const cpfRefund = Math.max(0, i.cpfRefund || 0);
  const legalFees = Math.max(0, i.legalFees || 0);

  const rows: NetProceedsRow[] = [
    { label: "Agent commission", amount: commission, note: `${i.commissionPct || 0}% of sale price` },
    ...(i.gst ? [{ label: "GST on commission", amount: gstAmount, note: "9%" }] : []),
    ...(ssd.liable ? [{ label: "Seller's Stamp Duty", amount: ssd.duty, note: ssd.tierLabel }] : []),
    { label: "Outstanding home loan", amount: outstandingLoan, note: "redeemed on completion" },
    { label: "CPF refund", amount: cpfRefund, note: "principal + accrued interest, back to your CPF OA" },
    { label: "Legal / conveyancing fees", amount: legalFees },
  ].filter((r) => r.amount > 0);

  const totalDeductions = commission + gstAmount + ssd.duty + outstandingLoan + cpfRefund + legalFees;
  const netProceeds = salePrice - totalDeductions;

  return {
    salePrice,
    commission,
    gstAmount,
    ssd,
    outstandingLoan,
    cpfRefund,
    legalFees,
    totalDeductions,
    netProceeds,
    rows,
  };
}
