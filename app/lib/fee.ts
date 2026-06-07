// Subscription model (2026): there is NO success fee. FairComparisons is a
// licence-safe comparison/data platform paid only by optional agent tool
// subscriptions, never by a cut of any sale. This constant is kept at 0 so any
// remaining completion/invoice code records no fee. That success-fee subsystem
// is dormant under the subscription model and slated for removal.

export const PLATFORM_FEE_PCT = 0;
export const GST_PCT = 9; // Singapore GST, retained for subscription invoicing
export const FEE_RATE_NAME = "no success fee (subscription model)";
export const FEE_PCT_DISPLAY = "0%";
