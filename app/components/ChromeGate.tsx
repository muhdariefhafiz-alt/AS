"use client";

import { usePathname } from "next/navigation";

// Hides site chrome (header/footer) on /embed/* routes so the calculator can be
// iframed onto other sites cleanly. usePathname resolves during SSR for client
// components, so the chrome is not rendered server-side on embed routes either.
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;
  return <>{children}</>;
}
