"use client";

import { formatCost, formatTokens } from "@/lib/agents";
import { archiveHasConversation } from "@/lib/archive";
import type { Session, SessionArchive } from "@/lib/types";
import { formatSpan, sessionLabel } from "@/lib/workspace";

function countMessages(archive: SessionArchive | null): number {
  return (
    archive?.items.filter((item) => item.kind === "message" && item.role.toLowerCase() !== "system")
      .length ?? 0
  );
}

function countTools(archive: SessionArchive | null): number {
  const inTranscript = archive?.items.filter((item) => item.kind === "tool").length ?? 0;
  const recorded = archive?.stats?.tool_calls;
  if (recorded == null) return inTranscript;
  return Math.max(recorded, inTranscript);
}

export function SessionFinale({
  session,
  archive,
  reading,
  onToggle,
}: {
  session: Session;
  archive: SessionArchive | null;
  reading: boolean;
  onToggle: () => void;
}) {
  const title = sessionLabel(session);
  const span = formatSpan(session.created_at, session.stopped_at);
  const stats = archive?.stats;
  const canRead = archiveHasConversation(archive);
  const cells = [
    { label: "Tokens", value: formatTokens(stats?.total_tokens) },
    { label: "Cached", value: formatTokens(stats?.cached_tokens) },
    { label: "Cost", value: formatCost(stats?.cost) },
    { label: "LLM calls", value: stats?.requests != null ? String(stats.requests) : "—" },
    { label: "Messages", value: archive ? String(countMessages(archive)) : "—" },
    { label: "Tools", value: archive ? String(countTools(archive)) : "—" },
  ];

  return (
    <div className={reading ? "shrink-0 border-b border-line px-4 py-3" : "flex flex-1 flex-col items-center justify-center px-6 py-16"}>
      <div className={reading ? "" : "w-full max-w-lg text-center"}>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {session.status === "error" ? "Session failed" : "Session ended"}
          {span ? ` · ${span}` : ""}
        </p>
        <h2 className={`text-fg ${reading ? "mt-1 truncate text-[14px]" : "mt-3 text-[18px] leading-6"}`}>
          {title}
        </h2>
        {reading ? null : (
          <p className="mt-2 text-[12px] text-muted">
            {session.repo} · {session.branch}
          </p>
        )}
        {session.status === "error" && session.error ? (
          <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap border border-line bg-surface p-3 text-left font-mono text-[12px] text-danger">
            {session.error}
          </pre>
        ) : null}
        <dl className={`grid grid-cols-3 gap-2 text-left ${reading ? "mt-3" : "mt-6"}`}>
          {cells.map((cell) => (
            <div key={cell.label} className="border border-line px-2.5 py-2">
              <dt className="text-[11px] text-muted">{cell.label}</dt>
              <dd className="mt-0.5 text-[13px] text-fg">{cell.value}</dd>
            </div>
          ))}
        </dl>
        <div className={reading ? "mt-3 text-left" : "mt-6"}>
          {canRead ? (
            <button
              type="button"
              onClick={onToggle}
              className="border border-line px-3 py-1.5 text-[13px] text-fg hover:bg-surface"
            >
              {reading ? "Hide conversation" : "Read conversation"}
            </button>
          ) : (
            <p className="text-[13px] text-muted">The transcript was not saved for this run.</p>
          )}
        </div>
      </div>
    </div>
  );
}
