import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-only admin client. Bypasses RLS — use for seller-funnel writes
// (sg_leads, sg_lead_shortlist, sg_lead_quotes, sg_lead_completions) which
// have RLS on with no anon policies. Throws on the server if the env var is
// missing so we never silently fall back to anon.
let _adminClient: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "supabaseAdmin requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  _adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminClient;
}

// SG Types
export type Agency = {
  id: number;
  name: string;
  license_number: string;
  slug: string;
  agent_count: number;
  google_rating: number | null;
  google_review_count: number;
  google_place_id: string | null;
  address: string | null;
  postal_code: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  specializations: string[];
  score: number | null;
  score_breakdown: Record<string, number> | null;
};

export type Agent = {
  id: number;
  name: string;
  slug: string;
  cea_registration: string;
  agency_id: number | null;
  agency_name: string;
  google_rating: number | null;
  google_review_count: number;
  specializations: string[];
  score: number | null;
};

export type District = {
  id: number;
  code: string;
  name: string;
  slug: string | null;
  description: string | null;
  agency_count: number;
  agent_count: number;
  avg_price_hdb: number | null;
  avg_price_condo: number | null;
};
