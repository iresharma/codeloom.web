import type { ModelCapability } from "./types";

export const REASONING_EFFORT_LEVELS = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORT_LEVELS)[number];

/** Effort levels to offer for a model, honoring its own allowlist when it
 * has one (null/absent means every level is accepted). */
export function effortOptionsFor(capability: ModelCapability | undefined): string[] {
  if (!capability?.supports_reasoning) return [];
  const allowed = capability.supported_efforts;
  if (allowed && allowed.length > 0) {
    return allowed.filter((level) => level !== "none");
  }
  return [...REASONING_EFFORT_LEVELS];
}

export function effortLabel(level: string): string {
  if (level === "xhigh") return "Extra high";
  return level.charAt(0).toUpperCase() + level.slice(1);
}
