import { ImageResponse } from "next/og";

export const alt = "Watto — marathon training plans, shaped around your race";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const accent = "#5a7a3a";
  const bg = "#f7f8f6";
  const text = "#1a2e12";
  const muted = "#5e7254";
  const border = "#dde3d8";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: bg,
          backgroundImage: `radial-gradient(circle at 85% 15%, rgba(90,122,58,0.14), transparent 55%), radial-gradient(circle at 10% 90%, rgba(90,122,58,0.08), transparent 50%)`,
          color: text,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 88,
              height: 88,
              borderRadius: 20,
              background: accent,
            }}
          >
            <svg
              width="56"
              height="56"
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 9 L10 24 L16 14 L22 24 L25 9"
                fill="none"
                stroke="#f7f8f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Watto<span style={{ color: accent }}>.</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
              maxWidth: 960,
            }}
          >
            Marathon training plans, shaped around your race.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: muted,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Adaptive, block-periodised and synced with Strava.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${border}`,
            paddingTop: 28,
            fontSize: 24,
            color: muted,
          }}
        >
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
                Structure
              </span>
              <span style={{ fontSize: 28, color: text, fontWeight: 600 }}>
                Pyramidal blocks
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
                Growth
              </span>
              <span style={{ fontSize: 28, color: text, fontWeight: 600 }}>
                ≤10% / week
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
                Taper
              </span>
              <span style={{ fontSize: 28, color: text, fontWeight: 600 }}>
                17 days
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
