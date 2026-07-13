import { NextResponse } from "next/server";
import {
  hdbValuation,
  privateValuation,
  isValidHdbFlatType,
  makeAvmToken,
} from "../../../lib/avm";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(
      `avm:${ip}`,
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
      mode, // "hdb" | "private"
      town,
      flat_type,
      block,
      project_slug,
      persist,
      email,
      whatsapp,
      marketing_consent,
    } = body ?? {};

    let result:
      | Awaited<ReturnType<typeof hdbValuation>>
      | Awaited<ReturnType<typeof privateValuation>>
      | null = null;
    let area: string | null = null;
    let propertyType = "HDB";

    if (mode === "hdb") {
      if (!town || !isValidHdbFlatType(flat_type)) {
        return NextResponse.json(
          { error: "Pick a town and flat type." },
          { status: 400 }
        );
      }
      result = await hdbValuation(String(town), flat_type, block ?? null);
      area = String(town).toUpperCase();
      propertyType = "HDB";
    } else if (mode === "private") {
      if (!project_slug || typeof project_slug !== "string") {
        return NextResponse.json(
          { error: "Pick a development." },
          { status: 400 }
        );
      }
      const pv = await privateValuation(project_slug);
      result = pv;
      area = pv?.district ? `D${pv.district}` : null;
      propertyType = "CONDO";
    } else {
      return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Not enough recent transactions to estimate. Try a nearby area or check back next month.",
        },
        { status: 422 }
      );
    }

    let token: string | null = null;
    if (persist === true) {
      if (!email && !whatsapp) {
        return NextResponse.json(
          { error: "Provide an email or WhatsApp to track this." },
          { status: 400 }
        );
      }
      token = makeAvmToken();
      const sb = supabaseAdmin();
      const { error } = await sb.from("sg_leads").insert({
        token,
        status: "avm_watch",
        property_type: propertyType,
        town: mode === "hdb" ? area : null,
        district_code: mode === "private" ? area : null,
        full_name: "AVM watcher",
        email: email ? String(email).toLowerCase().trim() : null,
        whatsapp: whatsapp ? String(whatsapp).trim() : null,
        pdpa_consent: true,
        marketing_consent: marketing_consent === true,
        source: "avm",
        reason: "investment",
        est_value_low: result.low,
        est_value_high: result.high,
        // Exact flat type so My Home + the avm-updates cron re-value the right
        // band instead of the historical 4 ROOM proxy.
        flat_type: mode === "hdb" && isValidHdbFlatType(flat_type) ? flat_type : null,
      });
      if (error) {
        console.error("[avm/lookup] persist failed", error);
        token = null;
      }
    }

    return NextResponse.json({ success: true, result, token });
  } catch (err) {
    console.error("[avm/lookup] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
