import { supabase } from "../lib/supabase";

// Activity-based social proof, gated on REAL data. Shows the count of sales
// actually completed through FairComparisons, and only once it crosses a
// meaningful threshold. Below that it renders nothing rather than fabricate a
// number (no-fake-data rule). Auto-activates as real referred sales close.
const THRESHOLD = 10;

export default async function SellerProof() {
  const { count } = await supabase
    .from("sg_lead_completions")
    .select("id", { count: "exact", head: true })
    .eq("fee_status", "paid");

  const completed = count ?? 0;
  if (completed < THRESHOLD) return null;

  // Round down to a clean floor so the figure reads as a credible milestone.
  const floor = completed >= 100 ? Math.floor(completed / 50) * 50 : Math.floor(completed / 10) * 10;

  return (
    <div className="fc-row" style={{ justifyContent: "center", marginTop: 18 }}>
      <span className="fc-badge fc-badge--ranked">
        <span className="dot" /> {floor.toLocaleString()}+ sales completed through FairComparisons
      </span>
    </div>
  );
}
