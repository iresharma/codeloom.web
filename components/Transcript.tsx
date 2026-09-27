"use client";

import { useState } from "react";

import {
  chatActivity,
  isAssistantMessage,
  isUserMessage,
  toolHeadline,
  visibleChatItems,
} from "@/lib/chat";
import { toolDiff } from "@/lib/diff";
import type { AgentRow, ChatItem, ChatTool, PendingPrompt } from "@/lib/types";

import { DiffView } from "./DiffView";
import { Markdown } from "./Markdown";

function ToolCall({ item }: { item: ChatTool }) {
  const diff = toolDiff(item);
  const [open, setOpen] = useState(Boolean(diff));
  const running = item.ok === undefined;
  const headline = toolHeadline(item);
  const hasBody = Boolean(diff || item.preview || item.arguments_json);

  return (
    <div className="overflow-hidden rounded border border-line bg-surface">
      <button
        type="button"
        onClick={() => hasBody && setOpen((current) => !current)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
        aria-expanded={hasBody ? open : undefined}
      >
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            running ? "animate-pulse bg-warn" : item.ok ? "bg-ok" : "bg-danger"
          }`}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{headline.title}</span>
        <span className="shrink-0 text-[12px] text-muted">
          {running ? "running" : item.ok ? (item.duration_ms ? `${item.duration_ms}ms` : "done") : "failed"}
        </span>
        {hasBody ? <span className="text-[11px] text-muted">{open ? "▾" : "▸"}</span> : null}
      </button>
      {open && hasBody ? (
        <div className="border-t border-line">
          {diff ? (
            <div className="max-h-80 overflow-auto">
              <DiffView path={diff.path} oldValue={diff.oldValue} newValue={diff.newValue} />
            </div>
          ) : (
            <div className="space-y-2 px-2.5 py-2">
              {headline.detail && headline.detail !== headline.title ? (
                <div className="font-mono text-[11px] text-muted">{headline.detail}</div>
              ) : null}
              {item.arguments_json ? (
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-4 text-muted">
                  {item.arguments_json}
                </pre>
              ) : null}
              {item.preview ? (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-4 text-fg/80">
                  {item.preview}
                </pre>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ActivityLine({
  items,
  agents,
  selectedAgentId,
  pendingPrompt,
}: {
  items: ChatItem[];
  agents: AgentRow[];
  selectedAgentId: string;
  pendingPrompt: PendingPrompt | null;
}) {
  const activity = chatActivity(items, agents, selectedAgentId, pendingPrompt);
  if (!activity) return null;
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-[13px] text-muted">
      <span
        className={`size-1.5 rounded-full ${
          activity.tone === "wait" ? "bg-warn" : "animate-pulse bg-muted"
        }`}
        aria-hidden
      />
      {activity.label}
    </div>
  );
}

export function Transcript({
  items,
  agents,
  selectedAgentId,
  pendingPrompt,
}: {
  items: ChatItem[];
  agents: AgentRow[];
  selectedAgentId: string;
  pendingPrompt: PendingPrompt | null;
}) {
  const visible = visibleChatItems(items);

  if (visible.length === 0) {
    return (
      <div className="space-y-3">
        <p className="px-1 py-10 text-[13px] text-muted">Send a message to start the agent.</p>
        <ActivityLine
          items={items}
          agents={agents}
          selectedAgentId={selectedAgentId}
          pendingPrompt={pendingPrompt}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((item) => {
        if (item.kind === "tool") {
          return <ToolCall key={item.call_id} item={item} />;
        }
        if (isUserMessage(item)) {
          return (
            <article key={item.id} className="ml-10 border border-line bg-surface px-3 py-2">
              <div className="text-[12px] text-muted">You</div>
              <div className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-fg">{item.text}</div>
            </article>
          );
        }
        if (isAssistantMessage(item)) {
          return (
            <article key={item.id} className="space-y-1">
              <div className="text-[12px] text-muted">
                {item.streaming && !item.text.trim() ? "Thinking" : "Assistant"}
              </div>
              {item.text.trim() ? <Markdown text={item.text} /> : null}
            </article>
          );
        }
        return null;
      })}
      <ActivityLine
        items={items}
        agents={agents}
        selectedAgentId={selectedAgentId}
        pendingPrompt={pendingPrompt}
      />
    </div>
  );
}
