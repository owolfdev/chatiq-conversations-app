import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    mdxRs: {
      mdxType: "gfm" as const,
    },
  },
  // Expose beta mode to client (safe - it's just a UI indicator)
  env: {
    NEXT_PUBLIC_BETA_MODE: process.env.BETA_MODE || "false",
  },
  async rewrites() {
    return [
      {
        source: "/__test/500",
        destination: "/test/500",
      },
      {
        source: "/__test/500-page",
        destination: "/test/500-page",
      },
    ];
  },
  // Note: The middleware.js.nft.json error is a known Vercel/Next.js 16 issue
  // that doesn't break the build. It's related to file tracing for serverless functions.
  // The build completes successfully despite this warning. This is a harmless warning
  // that can be safely ignored. Vercel is aware of this issue and it doesn't affect functionality.
};

const withMDX = createMDX();

// Merge MDX config with Next.js config
export default withMDX(nextConfig);
