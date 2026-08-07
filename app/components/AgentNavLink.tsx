"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The one nav link that has to know whether anybody is signed in.
 *
 * The header lives in the root layout, so reading the real `fc_agent` session
 * cookie there would make EVERY page dynamic and cost static rendering across
 * roughly 38,000 agent pages. That is why this link used to be a flat "Sign in"
 * for everyone, which meant a signed-in agent was permanently invited to sign
 * in to the account they were already using.
 *
 * So the swap happens in the browser instead. The session cookie stays
 * httpOnly and unreadable; alongside it the login routes set `fc_signed_in=1`,
 * which is readable by script ON PURPOSE and carries no identity, no email and
 * no token. It grants nothing: every route still derives the agent from the
 * signed httpOnly cookie. Forging this one only changes a word in the nav.
 *
 * The href is the same either way, so the link works before hydration and for
 * anyone with JS disabled: /dashboard shows the sign-in form when there is no
 * session, and the dashboard when there is. Rendering "Sign in" first and
 * correcting after mount avoids a hydration mismatch.
 */
export default function AgentNavLink({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // Deferred a tick rather than set synchronously in the effect body, the
    // same pattern the dashboard uses for its mount-time URL sync.
    queueMicrotask(() =>
      setSignedIn(document.cookie.split("; ").some((c) => c.startsWith("fc_signed_in=1"))),
    );
  }, []);

  return (
    <Link href="/dashboard" className={className} style={style}>
      {signedIn ? "Dashboard" : "Sign in"}
    </Link>
  );
}
