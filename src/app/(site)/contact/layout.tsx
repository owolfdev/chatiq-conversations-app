import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact ChatIQ support or sales for help and onboarding.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact ChatIQ",
    description: "Contact ChatIQ support or sales for help and onboarding.",
    url: "/contact",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact ChatIQ",
    description: "Contact ChatIQ support or sales for help and onboarding.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
