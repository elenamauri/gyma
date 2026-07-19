import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          border: "16px solid #161614",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: "#161614",
            letterSpacing: -2,
          }}
        >
          GYMA
        </div>
        <div
          style={{
            marginTop: 40,
            width: 280,
            height: 12,
            background: "#E1442C",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
