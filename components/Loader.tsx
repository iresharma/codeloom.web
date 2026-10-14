"use client";

const SIZES = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-7",
} as const;

const LABEL_SIZES = {
  sm: "text-[12px]",
  md: "text-[13px]",
  lg: "text-[13px]",
} as const;

export default function Loader({ size = "md", label }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const glyph = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`loader-shuttle shrink-0 ${SIZES[size]} text-muted`}
    >
      <path
        d="M2 8h20M2 16h20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path d="M12 5C16.5 8 16.5 16 12 19C7.5 16 7.5 8 12 5Z" fill="currentColor" />
    </svg>
  );

  if (!label) {
    return (
      <span role="status" className="inline-flex">
        <span className="sr-only">Loading</span>
        {glyph}
      </span>
    );
  }

  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      {glyph}
      <span className={`text-muted ${LABEL_SIZES[size]}`}>{label}</span>
    </span>
  );
}
