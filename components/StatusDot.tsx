import { statusTone } from "@/lib/workspace";

const TONE_CLASS = {
  moss: "bg-ok",
  warn: "bg-warn",
  copper: "bg-danger",
  mute: "bg-muted",
} as const;

export function StatusDot({ status }: { status: string }) {
  const tone = statusTone(status);
  const live =
    status === "ready" ||
    status === "provisioning" ||
    status === "running" ||
    status === "thinking";
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${TONE_CLASS[tone]} ${live ? "animate-pulse" : ""}`}
      title={status}
      aria-label={status}
    />
  );
}
