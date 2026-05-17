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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #0c1424 100%)",
          color: "#0ea5e9",
          fontSize: 340,
          fontWeight: 800,
          letterSpacing: -10,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
