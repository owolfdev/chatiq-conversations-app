import type { ReactNode } from "react";
import CookieConsentBanner from "@/components/consent/cookie-consent-banner";
import SiteHeader from "@/components/nav/site-header";
import Footer from "@/components/nav/footer";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <Footer />
      <CookieConsentBanner />
    </>
  );
}
