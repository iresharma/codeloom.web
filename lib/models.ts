export const CUSTOM_MODEL = "__custom__";

export type ModelProvider =
  | "default"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "zai"
  | "google"
  | "xai"
  | "qwen"
  | "tencent"
  | "xiaomi"
  | "custom";

export type ModelGroup = "session" | "frontier" | "popular" | "other";

export type ModelOption = {
  value: string;
  label: string;
  hint: string;
  /** Active / total params when published; otherwise context window. */
  size?: string;
  /** OpenRouter weekly usage rank (all models, trailing 7 days). */
  rank?: number;
  provider: ModelProvider;
  group: ModelGroup;
};

export const MODEL_GROUPS: { id: ModelGroup; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "frontier", label: "Frontier" },
  { id: "popular", label: "OpenRouter coding" },
  { id: "other", label: "Other" },
];

/** Curated from OpenRouter programming usage (Sep 2026) plus frontier coding models. */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: "",
    label: "Default",
    hint: "Sandbox pins",
    provider: "default",
    group: "session",
  },
  {
    value: "anthropic/claude-opus-5.5",
    label: "Opus 5.5",
    hint: "Strongest Claude",
    size: "1M ctx",
    rank: 24,
    provider: "anthropic",
    group: "frontier",
  },
  {
    value: "anthropic/claude-sonnet-5",
    label: "Sonnet 5",
    hint: "Balanced Claude",
    size: "1M ctx",
    rank: 19,
    provider: "anthropic",
    group: "frontier",
  },
  {
    value: "openai/gpt-6-sol",
    label: "GPT-6 Sol",
    hint: "OpenAI frontier",
    size: "1M ctx",
    rank: 29,
    provider: "openai",
    group: "frontier",
  },
  {
    value: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    hint: "Strong coding",
    size: "1M ctx",
    rank: 16,
    provider: "openai",
    group: "frontier",
  },
  {
    value: "x-ai/grok-4.7",
    label: "Grok 4.7",
    hint: "xAI",
    size: "500k ctx",
    rank: 47,
    provider: "xai",
    group: "frontier",
  },
  {
    value: "deepseek/deepseek-v4.1-flash",
    label: "DeepSeek V4.1",
    hint: "Flash · top coding traffic",
    size: "16B / 552B",
    rank: 1,
    provider: "deepseek",
    group: "popular",
  },
  {
    value: "z-ai/glm-5.3-flash",
    label: "GLM 5.3 Flash",
    hint: "High coding usage",
    size: "18B / 320B",
    rank: 2,
    provider: "zai",
    group: "popular",
  },
  {
    value: "tencent/hy4-preview",
    label: "Hy4 Preview",
    hint: "Coding agents",
    size: "49B / 770B",
    rank: 4,
    provider: "tencent",
    group: "popular",
  },
  {
    value: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    hint: "Engine default",
    size: "1M ctx",
    rank: 5,
    provider: "openai",
    group: "popular",
  },
  {
    value: "openai/gpt-6-luna",
    label: "GPT-6 Luna",
    hint: "Fast GPT-6",
    size: "1M ctx",
    rank: 10,
    provider: "openai",
    group: "popular",
  },
  {
    value: "anthropic/claude-haiku-4.5",
    label: "Haiku 4.5",
    hint: "Tester pin",
    size: "200k ctx",
    rank: 60,
    provider: "anthropic",
    group: "popular",
  },
  {
    value: "google/gemini-3.8-flash",
    label: "Gemini 3.8",
    hint: "Flash · Google",
    size: "1M ctx",
    rank: 14,
    provider: "google",
    group: "popular",
  },
  {
    value: "xiaomi/mimo-v2.6-flash",
    label: "MiMo V2.6",
    hint: "Flash · OpenRouter top 10",
    size: "15B / 309B",
    rank: 8,
    provider: "xiaomi",
    group: "popular",
  },
  {
    value: "qwen/qwen3-coder",
    label: "Qwen3 Coder",
    hint: "Dedicated coder",
    size: "35B / 480B",
    rank: 149,
    provider: "qwen",
    group: "popular",
  },
  {
    value: CUSTOM_MODEL,
    label: "Custom",
    hint: "Any OpenRouter id",
    provider: "custom",
    group: "other",
  },
];

const KNOWN = new Set(MODEL_OPTIONS.map((option) => option.value));

export function modelOption(value: string): ModelOption | undefined {
  return MODEL_OPTIONS.find((option) => option.value === value);
}

export function isKnownPreset(value: string): boolean {
  return KNOWN.has(value);
}

export function modelDetail(option: ModelOption): string {
  return option.size ?? option.hint;
}
