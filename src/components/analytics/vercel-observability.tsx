"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { trackCosmosEvent } from "@/lib/cosmos-analytics";

const shouldLoadVercelScripts = process.env.NODE_ENV === "production";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    trackCosmosEvent("page_view", {
      path: pathname,
      hasQuery: Boolean(query),
    });
  }, [pathname, searchParams]);

  return null;
}

export function VercelObservability() {
  return (
    <>
      {shouldLoadVercelScripts ? (
        <>
          <Script id="vercel-analytics-queue" strategy="afterInteractive">
            {`window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};`}
          </Script>
          <Script
            id="vercel-analytics"
            src="/_vercel/insights/script.js"
            strategy="afterInteractive"
          />
          <Script id="vercel-speed-insights-queue" strategy="afterInteractive">
            {`window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments);};`}
          </Script>
          <Script
            id="vercel-speed-insights"
            src="/_vercel/speed-insights/script.js"
            strategy="afterInteractive"
          />
        </>
      ) : null}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
