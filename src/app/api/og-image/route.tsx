import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  // Load fonts and logo
  const [fontRegular, fontBold, logo] = await Promise.all([
    readFile(join(process.cwd(), "fonts/IBMPlexSans-Regular.ttf")),
    readFile(join(process.cwd(), "fonts/IBMPlexSans-Bold.ttf")),
    readFile(join(process.cwd(), "public/icon-512.png")),
  ]);

  // Convert logo to base64 data URL
  const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;

  // Convert fonts to ArrayBuffer
  const fontRegularArrayBuffer = new Uint8Array(fontRegular).buffer;
  const fontBoldArrayBuffer = new Uint8Array(fontBold).buffer;

  // Create grid pattern SVG (more visible, larger grid units: 64px)
  const gridSvg = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(203,213,225,1)" stroke-width="1"/>
    </svg>
  `)}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(to bottom right, rgba(248, 250, 252, 0.7), rgba(241, 245, 249, 0.7))`,
          fontFamily: "IBM Plex Sans",
          padding: "80px 120px",
        }}
      >
        {/* Grid background layer */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${gridSvg})`,
            backgroundSize: "64px 64px",
            opacity: 1,
            pointerEvents: "none",
          }}
        />

        {/* Content layer */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <img
            src={logoDataUrl}
            width={140}
            height={140}
            style={{ objectFit: "contain", marginBottom: 32 }}
          />

          {/* Title */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 20,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            ChatIQ
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: "#475569",
              textAlign: "center",
              maxWidth: 1000,
              lineHeight: 1.4,
            }}
          >
            Train on your content. Embed anywhere.
          </div>

          {/* Accent line */}
          <div
            style={{
              width: 160,
              height: 4,
              backgroundColor: "#10b981",
              marginTop: 32,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "IBM Plex Sans",
          data: fontRegularArrayBuffer,
          style: "normal" as const,
          weight: 400 as const,
        },
        {
          name: "IBM Plex Sans",
          data: fontBoldArrayBuffer,
          style: "normal" as const,
          weight: 700 as const,
        },
      ],
    }
  );
}

