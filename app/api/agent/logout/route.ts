import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AGENT_COOKIE } from "../../../lib/agent-auth";

export async function POST(req: Request) {
  const store = await cookies();
  store.delete(AGENT_COOKIE);
  // Clear the header hint too, or the nav keeps offering "Dashboard" to someone
  // who just signed out.
  store.delete("fc_signed_in");
  return NextResponse.redirect(new URL("/dashboard", req.url), { status: 303 });
}
