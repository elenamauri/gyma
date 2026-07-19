import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF8",
          border: "8px solid #161614",
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 700, color: "#161614" }}>GYMA</div>
        <div
          style={{
            marginTop: 16,
            width: 100,
            height: 6,
            background: "#E1442C",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
