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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #0c1424 100%)",
          color: "#0ea5e9",
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: -4,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
