"use client";

import { useState } from "react";

import { formatCost, formatDuration, formatTokens } from "@/lib/agents";
import {
  chatActivity,
  isSpawnTool,
  spawnCard,
  toolHeadline,
  visibleChatItems,
} from "@/lib/chat";
import { toolDiff } from "@/lib/diff";
import type { AgentRow, ChatItem, ChatTool, PendingPrompt, Stats } from "@/lib/types";

import { DiffView } from "./DiffView";
import { Markdown } from "./Markdown";

function spawnMeta(card: ReturnType<typeof spawnCard>): string {
  const bits: string[] = [];
  if (card.tokens != null) bits.push(`${formatTokens(card.tokens)} tok`);
  if (card.cost != null) bits.push(formatCost(card.cost));
  if (card.requests != null) bits.push(`${card.requests} calls`);
  if (card.durationMs != null) bits.push(formatDuration(card.durationMs));
  return bits.join(" · ");
}

function SpawnResult({
  item,
  card,
}: {
  item: ChatTool;
  card: ReturnType<typeof spawnCard>;
}) {
  const stats = [
    { label: "Status", value: card.status },
    { label: "Tokens", value: formatTokens(card.tokens) },
    { label: "Cached", value: formatTokens(card.cached) },
    { label: "Cost", value: formatCost(card.cost) },
    { label: "LLM calls", value: card.requests != null ? String(card.requests) : "—" },
    {
      label: "Duration",
      value: card.durationMs != null ? formatDuration(card.durationMs) : "—",
    },
  ];

  return (
    <div className="space-y-2">
      {card.error ? <p className="text-[12px] text-danger">{card.error}</p> : null}
      <div className="grid grid-cols-3 gap-1.5">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-line px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted">{stat.label}</div>
            <div className="text-[12px] text-fg">{stat.value}</div>
          </div>
        ))}
      </div>
      {card.task ? (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Task</div>
          <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-5 text-fg">{card.task}</p>
        </div>
      ) : null}
      {card.summary ? (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Result</div>
          <p className="mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap text-[12px] leading-5 text-fg/90">
            {card.summary}
          </p>
        </div>
      ) : !card.error ? (
        <p className="text-[12px] text-muted">
          {item.ok === undefined || card.status === "running" || card.status === "started"
            ? "Waiting for this agent to finish."
            : "Finished with no summary."}
        </p>
      ) : null}
      {card.branch ? <p className="font-mono text-[11px] text-muted">{card.branch}</p> : null}
    </div>
  );
}

function screenshotSrc(item: ChatTool): string | null {
  const image = item.image?.replace(/\s/g, "") ?? "";
  if (!image || image.length > 900_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) return null;
  const mime =
    item.image_mime === "image/png" || item.image_mime === "image/webp"
      ? item.image_mime
      : "image/jpeg";
  return `data:${mime};base64,${image}`;
}

function ToolCall({
  item,
  agents,
  stats,
  items,
}: {
  item: ChatTool;
  agents: AgentRow[];
  stats: Stats | null;
  items: ChatItem[];
}) {
  const spawn = isSpawnTool(item.name);
  const card = spawn ? spawnCard(item, agents, stats, items) : null;
  const diff = spawn ? null : toolDiff(item);
  const shot = spawn || diff ? null : screenshotSrc(item);
  const [open, setOpen] = useState(Boolean(diff) || (!spawn && item.ok === false));
  const running = item.ok === undefined;
  const headline = toolHeadline(item);
  const hasBody = Boolean(diff || spawn || item.preview || item.arguments_json);
  const meta = card
    ? spawnMeta(card) || (running ? "running" : item.ok ? "done" : "failed")
    : running
      ? "running"
      : item.ok
        ? item.duration_ms
          ? `${item.duration_ms}ms`
          : "done"
        : "failed";

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
        <span className="shrink-0 text-[12px] text-muted">{meta}</span>
        {hasBody ? <span className="text-[11px] text-muted">{open ? "▾" : "▸"}</span> : null}
      </button>
      {shot ? (
        <figure className="border-t border-line bg-canvas">
          <a href={shot} target="_blank" rel="noreferrer" className="block">
            <img
              src={shot}
              alt={item.preview?.trim() || "Page screenshot"}
              className="max-h-[28rem] w-full object-contain object-top"
            />
          </a>
          {item.preview ? (
            <figcaption className="truncate px-2.5 py-1 font-mono text-[11px] text-muted">
              {item.preview}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
      {open && hasBody ? (
        <div className="border-t border-line">
          {diff ? (
            <div className="max-h-80 min-w-0 overflow-auto">
              <DiffView path={diff.path} oldValue={diff.oldValue} newValue={diff.newValue} />
            </div>
          ) : (
            <div className="space-y-2 px-2.5 py-2">
              {card ? (
                <SpawnResult item={item} card={card} />
              ) : (
                <>
                  {headline.detail && headline.detail !== headline.title ? (
                    <div className="font-mono text-[11px] text-muted">{headline.detail}</div>
                  ) : null}
                  {item.arguments_json ? (
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-4 text-muted">
                      {item.arguments_json}
                    </pre>
                  ) : null}
                  {item.preview && !shot ? (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-4 text-fg/80">
                      {item.preview}
                    </pre>
                  ) : null}
                </>
              )}
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

const STARTERS = [
  "Explain how this repository is put together",
  "Find the riskiest bug and fix it",
  "Add a test around the main path",
];

function EmptyChat({
  repo,
  branch,
  onSuggest,
}: {
  repo: string;
  branch: string;
  onSuggest?: (text: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-5 flex size-10 items-center justify-center border border-line text-muted"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 4.5h12M3 9h8M3 13.5h5" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </div>
      <h2 className="text-[15px] text-fg">What should this agent do?</h2>
      <p className="mt-2 max-w-sm text-[13px] leading-5 text-muted">
        Describe a change in {repo || "this repository"}. The orchestrator reads the code, edits
        it, and reports what it did.
      </p>
      {branch ? <p className="mt-2 font-mono text-[11px] text-muted">{branch}</p> : null}
      {onSuggest ? (
        <div className="mt-6 flex w-full max-w-sm flex-col gap-1.5 text-left">
          {STARTERS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSuggest(prompt)}
              className="border border-line px-3 py-2 text-[13px] text-fg hover:bg-surface"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Transcript({
  items,
  agents,
  selectedAgentId,
  pendingPrompt,
  sessionStats,
  repo,
  branch,
  onSuggest,
}: {
  items: ChatItem[];
  agents: AgentRow[];
  selectedAgentId: string;
  pendingPrompt: PendingPrompt | null;
  sessionStats: Stats | null;
  repo?: string;
  branch?: string;
  onSuggest?: (text: string) => void;
}) {
  const visible = visibleChatItems(items);

  if (visible.length === 0) {
    if (selectedAgentId) {
      const agent = agents.find((row) => row.id === selectedAgentId);
      const title = agent?.profile || agent?.role || "Agent";
      return (
        <div className="flex min-h-full flex-col">
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <h2 className="text-[15px] text-fg">{title}</h2>
            <p className="mt-2 max-w-sm whitespace-pre-wrap text-[13px] leading-5 text-muted">
              {agent?.task?.trim() || "No messages from this agent yet."}
            </p>
          </div>
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
      <div className="flex min-h-full flex-col">
        <EmptyChat repo={repo ?? ""} branch={branch ?? ""} onSuggest={onSuggest} />
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
          return (
            <ToolCall key={item.call_id} item={item} agents={agents} stats={sessionStats} items={items} />
          );
        }
        if (item.kind !== "message") return null;
        if (item.role.toLowerCase() === "user") {
          return (
            <article key={item.id} className="ml-10 border border-line bg-surface px-3 py-2">
              <div className="text-[12px] text-muted">You</div>
              <div className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-fg">{item.text}</div>
            </article>
          );
        }
        if (item.role.toLowerCase() === "assistant") {
          return (
            <article key={item.id} className="space-y-1">
              <div className="text-[12px] text-muted">
                {item.streaming && !item.text.trim() ? "Thinking" : "Assistant"}
              </div>
              {item.text.trim() ? <Markdown text={item.text} /> : null}
            </article>
          );
        }
        if (item.role.toLowerCase() === "tool") {
          return (
            <pre
              key={item.id}
              className="max-h-48 overflow-auto whitespace-pre-wrap border border-line bg-surface px-2.5 py-2 font-mono text-[11px] leading-4 text-fg/80"
            >
              {item.text}
            </pre>
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
