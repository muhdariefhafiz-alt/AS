"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isInternalPath } from "../lib/isBot";

const GA_ID = "G-K4D8EQ6D9G";

// Internal surfaces (admin, agent dashboard) are operator/customer tooling, not
// marketing traffic. Shares isInternalPath with the homebuilt tracker so GA4 and
// our own page_views can't disagree about who counts as a visitor.
export default function Analytics() {
  const pathname = usePathname();

  // GA's official kill switch. Covers SPA navigation both ways: entering an
  // internal route after the tag loaded stops further hits (including
  // history-change page_views); leaving it re-enables them.
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = isInternalPath(pathname);
  }, [pathname]);

  // Direct entry on an internal route: don't load the tag at all.
  if (isInternalPath(pathname)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
        }}
      />
    </>
  );
}
