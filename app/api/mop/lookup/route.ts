import { NextResponse } from "next/server";
import {
  clampMonth,
  clampYear,
  HDB_FLAT_TYPES,
  isValidHdbFlatType,
  lookupMop,
  makeMopToken,
} from "../../../lib/mop";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

const ALLOWED_TOWNS = new Set([
  "ANG MO KIO",
  "BEDOK",
  "BISHAN",
  "BUKIT BATOK",
  "BUKIT MERAH",
  "BUKIT PANJANG",
  "BUKIT TIMAH",
  "CENTRAL AREA",
  "CHOA CHU KANG",
  "CLEMENTI",
  "GEYLANG",
  "HOUGANG",
  "JURONG EAST",
  "JURONG WEST",
  "KALLANG/WHAMPOA",
  "MARINE PARADE",
  "PASIR RIS",
  "PUNGGOL",
  "QUEENSTOWN",
  "SEMBAWANG",
  "SENGKANG",
  "SERANGOON",
  "TAMPINES",
  "TENGAH",
  "TOA PAYOH",
  "WOODLANDS",
  "YISHUN",
]);

// Per-IP rate limit (Redis-backed when configured).
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(
      `mop:${ip}`,
      RATE_LIMIT,
      RATE_WINDOW_MS
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      town,
      flat_type,
      key_collection_year,
      key_collection_month,
      persist,
      email,
      whatsapp,
      marketing_consent,
    } = body ?? {};

    if (!town || !ALLOWED_TOWNS.has(String(town).toUpperCase())) {
      return NextResponse.json({ error: "Unknown HDB town." }, { status: 400 });
    }
    if (!isValidHdbFlatType(flat_type)) {
      return NextResponse.json(
        {
          error: `Flat type must be one of: ${HDB_FLAT_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const year = clampYear(Number(key_collection_year));
    const month = clampMonth(Number(key_collection_month));

    const result = await lookupMop({
      town: String(town).toUpperCase(),
      flat_type,
      key_collection_year: year,
      key_collection_month: month,
    });

    // Optional persistence (only when seller asks to be tracked).
    let token: string | null = null;
    if (persist === true) {
      if (!email && !whatsapp) {
        return NextResponse.json(
          { error: "Provide an email or WhatsApp to be alerted." },
          { status: 400 }
        );
      }
      token = makeMopToken();
      const sb = supabaseAdmin();
      const { error } = await sb.from("sg_leads").insert({
        token,
        status: "mop_watch",
        property_type: "HDB",
        town: String(town).toUpperCase(),
        full_name: "MOP watcher",
        email: email ? String(email).toLowerCase().trim() : null,
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        pdpa_consent: true,
        marketing_consent: marketing_consent === true,
        current_mop_status: result.mop_status,
        source: "mop_tracker",
        reason: "upgrade",
        est_value_low: result.median_resale_price
          ? Math.round(result.median_resale_price * 0.9)
          : null,
        est_value_high: result.median_resale_price
          ? Math.round(result.median_resale_price * 1.1)
          : null,
      });
      if (error) {
        console.error("[mop/lookup] persist failed", error);
        token = null;
      }
    }

    return NextResponse.json({
      success: true,
      result,
      token,
    });
  } catch (err) {
    console.error("[mop/lookup] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
