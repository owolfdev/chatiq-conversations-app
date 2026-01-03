import type { ReactNode } from "react";
import { headers } from "next/headers";
import CookieConsentBanner from "@/components/consent/cookie-consent-banner";
import SiteHeader from "@/components/nav/site-header";
import Footer from "@/components/nav/footer";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("next-url") ?? "";
  const hideFooter = pathname === "/" || pathname.startsWith("/?");

  return (
    <>
      <SiteHeader />
      {children}
      {/* {!hideFooter && <Footer />} */}
      <CookieConsentBanner />
    </>
  );
}
