// Single source of truth for the platform success fee.
//
// 2026 launch rate: 0.25% (down from 0.5%) to be aggressive on market entry.
// The fee is stored per-completion at invoice time, so changing this only
// affects NEW invoices; historical invoices keep their recorded rate.

export const PLATFORM_FEE_PCT = 0.25;
export const GST_PCT = 9; // Singapore GST, 2026
export const FEE_RATE_NAME = "2026 launch rate";
export const FEE_PCT_DISPLAY = "0.25%";
