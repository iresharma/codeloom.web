"use client";

import { agentStats, formatCost, formatDuration, formatTokens } from "@/lib/agents";
import { toolHeadline } from "@/lib/chat";
import type { AgentRow, ChatItem, Stats } from "@/lib/types";

import { FileIcon } from "./FileIcons";
import { StatusDot } from "./StatusDot";

export function AgentDetail({
  agent,
  isRoot,
  items,
  sessionStats,
  onOpenFile,
}: {
  agent: AgentRow | null;
  isRoot: boolean;
  items: ChatItem[];
  sessionStats: Stats | null;
  onOpenFile: (path: string) => void;
}) {
  const stats = agentStats(agent, items, sessionStats, isRoot);
  const title = isRoot ? "Orchestrator" : agent?.profile || agent?.role || "Agent";

  return (
    <div className="space-y-3 text-[12px]">
      <div>
        <div className="flex items-center gap-2">
          {agent ? <StatusDot status={agent.status} /> : null}
          <span className="text-[13px] text-fg">{title}</span>
        </div>
        <div className="mt-0.5 text-muted">
          {isRoot ? "root" : agent?.status}
          {agent?.branch ? ` · ${agent.branch}` : ""}
        </div>
      </div>

      <section>
        <h3 className="mb-1 text-muted">Prompt</h3>
        {stats.prompt ? (
          <p className="whitespace-pre-wrap text-fg">{stats.prompt}</p>
        ) : (
          <p className="text-muted">No prompt recorded yet.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Stat label="Tools" value={String(stats.toolCount)} />
        <Stat label="Running" value={String(stats.runningTools)} />
        <Stat label="Failed" value={String(stats.failedTools)} />
        <Stat label="Tool time" value={formatDuration(stats.durationMs)} />
        <Stat label="Tokens" value={formatTokens(stats.tokens)} />
        <Stat label="Cost" value={formatCost(stats.cost)} />
        <Stat
          label="LLM calls"
          value={
            isRoot && sessionStats?.requests != null
              ? String(sessionStats.requests)
              : stats.turns != null
                ? String(stats.turns)
                : "—"
          }
        />
        <Stat label="Files" value={String(stats.files.length)} />
      </section>

      <section>
        <h3 className="mb-1 text-muted">Files touched</h3>
        {stats.files.length === 0 ? (
          <p className="text-muted">None from tool calls yet.</p>
        ) : (
          <ul>
            {stats.files.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => onOpenFile(path)}
                  className="flex w-full items-center gap-1.5 py-0.5 text-left hover:text-fg"
                >
                  <FileIcon />
                  <span className="truncate font-mono text-[11px] text-fg">{path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-muted">Tool calls</h3>
        {stats.tools.length === 0 ? (
          <p className="text-muted">None yet. Select the agent to load its transcript.</p>
        ) : (
          <ul className="space-y-1">
            {stats.tools.map((tool) => {
              const headline = toolHeadline(tool);
              return (
                <li key={tool.call_id} className="flex items-center gap-2 text-[11px]">
                  <StatusDot
                    status={tool.ok === undefined ? "provisioning" : tool.ok ? "ready" : "error"}
                  />
                  <span className="min-w-0 truncate text-fg">{headline.title}</span>
                  <span className="shrink-0 text-muted">
                    {tool.ok === undefined ? "running" : tool.duration_ms ? `${tool.duration_ms}ms` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-2 py-1.5">
      <div className="text-muted">{label}</div>
      <div className="text-fg">{value}</div>
    </div>
  );
}
