import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** App icon / PWA — safe padding for maskable home-screen crops. */
export default function Icon() {
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
            width: 360,
            height: 360,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#161614",
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            GYMA
          </div>
          <div
            style={{
              marginTop: 28,
              width: 120,
              height: 10,
              background: "#E1442C",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
