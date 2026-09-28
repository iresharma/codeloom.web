import type { ReactNode } from "react";

import type { ModelProvider } from "@/lib/models";

const TONE: Record<ModelProvider, string> = {
  default: "text-muted",
  openai: "text-[#10a37f]",
  anthropic: "text-[#d4a27f]",
  deepseek: "text-[#4d6bfe]",
  zai: "text-[#e85d4c]",
  google: "text-fg",
  xai: "text-fg",
  qwen: "text-[#615ced]",
  tencent: "text-[#12b7f5]",
  xiaomi: "text-[#ff6900]",
  custom: "text-muted",
};

function Frame({
  children,
  provider,
}: {
  children: ReactNode;
  provider: ModelProvider;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden
      className={`shrink-0 ${TONE[provider]}`}
    >
      {children}
    </svg>
  );
}

export function ProviderMark({ provider }: { provider: ModelProvider }) {
  if (provider === "openai") {
    return (
      <Frame provider={provider}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="8"
            cy="3.35"
            rx="1.25"
            ry="2.55"
            fill="currentColor"
            transform={`rotate(${deg} 8 8)`}
          />
        ))}
      </Frame>
    );
  }
  if (provider === "anthropic") {
    return (
      <Frame provider={provider}>
        {[0, 45, 90, 135].map((deg) => (
          <rect
            key={deg}
            x="7.15"
            y="1.4"
            width="1.7"
            height="13.2"
            fill="currentColor"
            transform={`rotate(${deg} 8 8)`}
          />
        ))}
      </Frame>
    );
  }
  if (provider === "deepseek") {
    return (
      <Frame provider={provider}>
        <path
          fill="currentColor"
          d="M2.2 8.1c0-2.9 2.7-5.3 6.1-5.3 2.4 0 4.3.9 5.4 2.1L15 4v4.4c0 3.1-2.8 5.4-6.4 5.4-2.2 0-4.2-.8-5.4-2.2C2.4 12.2 2.2 10.4 2.2 8.1Z"
        />
        <circle cx="6.1" cy="7.1" r=".7" fill="#111" />
      </Frame>
    );
  }
  if (provider === "zai") {
    return (
      <Frame provider={provider}>
        <path
          fill="currentColor"
          d="M3.2 3.2h9.6v2.1L7.6 10.7h5.2V13H3.2v-2.1l5.2-5.4H3.2V3.2Z"
        />
      </Frame>
    );
  }
  if (provider === "google") {
    return (
      <Frame provider={provider}>
        <circle cx="5.2" cy="5.2" r="2" fill="#ea4335" />
        <circle cx="10.8" cy="5.2" r="2" fill="#4285f4" />
        <circle cx="5.2" cy="10.8" r="2" fill="#fbbc05" />
        <circle cx="10.8" cy="10.8" r="2" fill="#34a853" />
      </Frame>
    );
  }
  if (provider === "xai") {
    return (
      <Frame provider={provider}>
        <path
          fill="currentColor"
          d="M3.1 3.1h3.1L8 6.2 9.8 3.1h3.1L9.6 8l3.4 4.9h-3.1L8 9.8 6.1 12.9H3l3.4-4.9L3.1 3.1Z"
        />
      </Frame>
    );
  }
  if (provider === "qwen") {
    return (
      <Frame provider={provider}>
        <path fill="currentColor" d="M8 1.4 14.6 8 8 14.6 1.4 8Z" />
        <circle cx="8" cy="8" r="2.1" fill="#111" />
      </Frame>
    );
  }
  if (provider === "tencent") {
    return (
      <Frame provider={provider}>
        <path
          fill="currentColor"
          d="M8 2.2c1.6 0 3.2.9 4.1 2.3.6-.2 1.3 0 1.6.6.4.7 0 1.5-.7 1.8.3 1.6-.2 3.2-1.4 4.3.6.5.8 1.3.4 2-.4.6-1.2.8-1.9.5C9.6 14.4 8.8 14.7 8 14.7c-.8 0-1.6-.3-2.1-1-.7.3-1.5.1-1.9-.5-.4-.7-.2-1.5.4-2C3.2 10.1 2.7 8.5 3 6.9c-.7-.3-1.1-1.1-.7-1.8.3-.6 1-.8 1.6-.6C4.8 3.1 6.4 2.2 8 2.2Z"
        />
        <circle cx="6.4" cy="7.2" r=".7" fill="#111" />
        <circle cx="9.6" cy="7.2" r=".7" fill="#111" />
      </Frame>
    );
  }
  if (provider === "xiaomi") {
    return (
      <Frame provider={provider}>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M3 3h10v10H3V3Zm1.7 1.7h1.8v6.6H4.7V4.7Zm4 0h1.8v6.6H8.7V4.7Z"
        />
      </Frame>
    );
  }
  if (provider === "custom") {
    return (
      <Frame provider={provider}>
        <path
          fill="currentColor"
          d="M3.2 11.4 10.8 3.8l1.4 1.4-7.6 7.6H3.2v-1.4Zm8.2-8.8 1.2-1.2 1.4 1.4-1.2 1.2-1.4-1.4Z"
        />
      </Frame>
    );
  }
  return (
    <Frame provider={provider}>
      <path
        fill="currentColor"
        d="M2.5 4.2h11v1.2H2.5V4.2Zm1.6 3.2h8v1.2h-8V7.4Zm-1.6 3.2h11v1.2H2.5v-1.2Z"
      />
    </Frame>
  );
}
