import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore example ChatIQ templates and use cases for common industries.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "ChatIQ Gallery",
    description:
      "Explore example ChatIQ templates and use cases for common industries.",
    url: "/gallery",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ Gallery",
    description:
      "Explore example ChatIQ templates and use cases for common industries.",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
