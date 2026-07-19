import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon (apple-touch-icon). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF8",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#161614",
              letterSpacing: -1.5,
              lineHeight: 1,
            }}
          >
            GYMA
          </div>
          <div
            style={{
              marginTop: 12,
              width: 56,
              height: 5,
              background: "#E1442C",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
