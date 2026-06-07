import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AGENT_COOKIE } from "../../../lib/agent-auth";

export async function POST(req: Request) {
  const store = await cookies();
  store.delete(AGENT_COOKIE);
  return NextResponse.redirect(new URL("/dashboard", req.url), { status: 303 });
}
