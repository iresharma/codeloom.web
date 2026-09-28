import type { PendingPrompt } from "./types";

export type PromptAction = {
  label: string;
  value: string;
  tone: "ok" | "danger" | "neutral";
};

const YES = new Set(["yes", "y", "allow", "approve", "ok", "okay", "accept", "continue"]);
const NO = new Set(["no", "n", "deny", "reject", "refuse", "cancel", "decline"]);
const ALWAYS = new Set(["always", "always allow", "alwaysallow", "allow always"]);
const SETTLE = new Set(["merge", "pr", "keep", "discard"]);
const TURN_CAP = new Set(["continue", "handoff", "stop"]);
const AUTO_STORAGE_KEY = "codeloom.auto";
const PERMISSION_KINDS = new Set([
  "permission",
  "permissions",
  "confirm",
  "confirmation",
  "approval",
  "approve",
  "yesno",
  "yes_no",
  "yes-no",
  "tool_permission",
  "tool-permission",
]);

function key(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function normalizeChoice(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object") {
    const row = raw as Record<string, unknown>;
    for (const field of ["value", "id", "choice", "label", "text"]) {
      const value = row[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

export function readChoices(source: Record<string, unknown> | null | undefined): string[] {
  if (!source) return [];
  const raw = source.choices ?? source.options ?? source.answers;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeChoice).filter((value): value is string => Boolean(value));
}

export function isPermissionPrompt(prompt: PendingPrompt): boolean {
  if (PERMISSION_KINDS.has(key(prompt.kind).replace(/\s+/g, "_"))) return true;
  const question = prompt.question.toLowerCase();
  if (
    /(yes\s*\/\s*no|\by\s*\/\s*n\b|\[y\/n\]|type yes|^\s*allow\b|allow (this|running|writing|editing|the)|permission|approve this|do you (want|allow)|may i\b)/.test(
      question,
    )
  ) {
    return true;
  }
  const choices = prompt.choices.map(key);
  const hasYes = choices.some((choice) => YES.has(choice) || ALWAYS.has(choice));
  const hasNo = choices.some((choice) => NO.has(choice));
  return hasYes && hasNo;
}

function pickValue(choices: string[], defaults: string[], fallback: string): string {
  const match = choices.find((choice) => defaults.includes(key(choice)));
  if (match) return match;
  return fallback;
}

export function promptActions(prompt: PendingPrompt): PromptAction[] | null {
  if (!isPermissionPrompt(prompt) && prompt.choices.length === 0) return null;
  if (!isPermissionPrompt(prompt) && prompt.choices.length > 0) {
    return prompt.choices.map((choice) => ({
      label: choice,
      value: choice,
      tone: YES.has(key(choice)) ? "ok" : NO.has(key(choice)) ? "danger" : "neutral",
    }));
  }

  const allow = pickValue(prompt.choices, [...YES], prompt.default && YES.has(key(prompt.default)) ? prompt.default : "yes");
  const deny = pickValue(prompt.choices, [...NO], "no");
  const always = prompt.choices.find((choice) => ALWAYS.has(key(choice)));
  const actions: PromptAction[] = [
    { label: "Allow", value: allow, tone: "ok" },
    { label: "Deny", value: deny, tone: "danger" },
  ];
  if (always) actions.push({ label: "Always allow", value: always, tone: "neutral" });
  return actions;
}

function choiceSet(prompt: PendingPrompt): Set<string> {
  return new Set(prompt.choices.map((choice) => choice.trim().toLowerCase()));
}

export function isSettlePrompt(prompt: PendingPrompt): boolean {
  const names = choiceSet(prompt);
  return names.size === SETTLE.size && [...SETTLE].every((name) => names.has(name));
}

export function isTurnCapPrompt(prompt: PendingPrompt): boolean {
  const names = choiceSet(prompt);
  return key(prompt.kind) === "choice" && [...TURN_CAP].every((name) => names.has(name));
}

/** Same replies as the engine `--auto` client. Turn-cap: one continue, then the engine hands off. */
export function autoAnswer(prompt: PendingPrompt, settle = "keep"): string {
  if (isSettlePrompt(prompt)) {
    const action = settle.trim().toLowerCase();
    return SETTLE.has(action) ? action : "keep";
  }
  if (key(prompt.kind).replace(/\s+/g, "_") === "mcp_auth") return "no";
  if (isTurnCapPrompt(prompt)) return "continue";
  if (isPermissionPrompt(prompt)) {
    return pickValue(
      prompt.choices,
      [...YES],
      prompt.default && YES.has(key(prompt.default)) ? prompt.default : "yes",
    );
  }
  if (prompt.default?.trim()) return prompt.default.trim();
  return "yes";
}

export function readAutoMode(): boolean {
  try {
    return window.localStorage.getItem(AUTO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAutoMode(on: boolean): void {
  try {
    window.localStorage.setItem(AUTO_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export function promptTitle(prompt: PendingPrompt): string {
  if (isPermissionPrompt(prompt)) return "Permission needed";
  if (prompt.kind.trim()) return prompt.kind.replace(/[_-]+/g, " ");
  return "Agent needs input";
}

export function splitPromptQuestion(question: string): {
  headline: string;
  meta: string;
  body: string;
} {
  const trimmed = question.trim();
  if (!trimmed) return { headline: "Agent needs input", meta: "", body: "" };
  const lines = trimmed.split("\n");
  const first = (lines[0] ?? "").trim();
  const tagged = first.match(/^\[([^\]]+)\]\s*(.*)$/);
  const headline = ((tagged ? tagged[2] : first) || "Agent needs input").trim();
  const meta = tagged?.[1]?.trim() ?? "";
  const body = lines.slice(1).join("\n").trim();
  if (body) return { headline, meta, body };
  if (trimmed.length > 180) {
    return { headline: headline.length > 80 ? `${headline.slice(0, 77)}…` : headline, meta, body: trimmed };
  }
  return { headline, meta, body: "" };
}
