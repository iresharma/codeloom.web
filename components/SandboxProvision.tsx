const WARPS = [34, 48, 62, 76, 90, 104, 118, 132, 146, 160, 174];
const WEFTS = [46, 62, 78, 94, 110];

export function SandboxProvision() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10"
      role="status"
      aria-live="polite"
    >
      <svg viewBox="0 0 208 156" className="h-[148px] w-[196px]" aria-hidden="true">
        <rect x="16" y="14" width="176" height="5" fill="#2c2c2c" />
        <rect x="16" y="137" width="176" height="5" fill="#2c2c2c" />
        <rect x="16" y="14" width="4" height="128" fill="#2c2c2c" />
        <rect x="188" y="14" width="4" height="128" fill="#2c2c2c" />
        {WARPS.map((x, index) => (
          <line
            key={x}
            x1={x}
            y1="19"
            x2={x}
            y2="137"
            className="loom-warp"
            stroke={index === 5 ? "#c45c26" : "#3a3a3a"}
            strokeWidth={index === 5 ? 1.5 : 1}
            style={{
              animationDelay: `${index * 0.14}s`,
              animationDirection: index % 2 === 0 ? "normal" : "reverse",
            }}
          />
        ))}
        {WEFTS.map((y, index) => (
          <line
            key={y}
            x1="28"
            y1={y}
            x2="180"
            y2={y}
            className="loom-weft"
            stroke={index % 2 === 0 ? "#8f8f8f" : "#c45c26"}
            strokeWidth="1.35"
            style={{ animationDelay: `${index * 0.74}s` }}
          />
        ))}
        <g className="loom-shuttle">
          <path d="M22 76 L46 70 L70 76 L46 82 Z" fill="#c45c26" />
          <circle cx="46" cy="76" r="2.1" fill="#111111" />
        </g>
      </svg>
      <p className="mt-5 text-[13px] text-muted">Provisioning sandbox…</p>
    </div>
  );
}
