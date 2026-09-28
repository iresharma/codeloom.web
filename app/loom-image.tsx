import { ImageResponse } from "next/og";

function Threads({ tall }: { tall: boolean }) {
  const threads = [
    { h: tall ? 220 : 64, color: "#c45c26" },
    { h: tall ? 340 : 96, color: "#e8e0d4" },
    { h: tall ? 260 : 76, color: "#c45c26" },
    { h: tall ? 180 : 52, color: "#e8e0d4" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: tall ? 28 : 12,
        height: tall ? 360 : 110,
        borderBottom: `${tall ? 2 : 2}px solid #9a8f80`,
        paddingBottom: tall ? 8 : 4,
      }}
    >
      {threads.map((thread) => (
        <div
          key={`${thread.color}-${thread.h}`}
          style={{ width: tall ? 5 : 3, height: thread.h, background: thread.color }}
        />
      ))}
    </div>
  );
}

export function loomImage(width: number, height: number, withWordmark: boolean) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: withWordmark ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#16130f",
          color: "#e8e0d4",
        }}
      >
        <Threads tall={withWordmark} />
        {withWordmark ? (
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 72 }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: 6,
                color: "#c45c26",
                textTransform: "uppercase",
              }}
            >
              Cloud agent
            </div>
            <div style={{ fontSize: 92, marginTop: 16, lineHeight: 1 }}>CodeLoom</div>
            <div style={{ fontSize: 28, marginTop: 24, color: "#9a8f80", maxWidth: 520 }}>
              Talk to a coding agent in an isolated sandbox for a GitHub repository.
            </div>
          </div>
        ) : null}
      </div>
    ),
    { width, height },
  );
}
