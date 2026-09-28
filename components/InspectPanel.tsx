"use client";

import { useState } from "react";

import { isAgentActive } from "@/lib/agents";
import { fileDir, fileName } from "@/lib/files";
import type { AgentRow, ChatItem, FileTreeNode, GitState, Stats } from "@/lib/types";

import { AgentDetail } from "./AgentDetail";
import { AgentGraph } from "./AgentGraph";
import { FileIcon } from "./FileIcons";
import { FileTree } from "./FileTree";

type Tab = "agents" | "changes" | "files";

const TABS: { id: Tab; label: string }[] = [
  { id: "agents", label: "Agents" },
  { id: "changes", label: "Changes" },
  { id: "files", label: "Files" },
];

function ChangeGroup({
  label,
  paths,
  onOpen,
}: {
  label: string;
  paths: string[] | undefined;
  onOpen: (path: string) => void;
}) {
  if (!paths?.length) return null;
  return (
    <section className="mb-4">
      <h3 className="mb-1 text-[12px] text-muted">
        {label} · {paths.length}
      </h3>
      <ul>
        {paths.map((path) => {
          const dir = fileDir(path);
          return (
            <li key={path}>
              <button
                type="button"
                onClick={() => onOpen(path)}
                className="flex w-full items-center gap-1.5 px-1 py-0.5 text-left hover:bg-canvas"
              >
                <FileIcon />
                <span className="min-w-0 truncate font-mono text-[12px]">
                  <span className="text-fg">{fileName(path)}</span>
                  {dir ? <span className="ml-1 text-muted">{dir}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function InspectPanel({
  collapsed,
  onToggle,
  tab,
  onTab,
  agents,
  selectedAgentId,
  onSelectAgent,
  itemsByAgent,
  sessionStats,
  git,
  fileTree,
  openFilePath,
  onOpenFile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  tab: Tab;
  onTab: (tab: Tab) => void;
  agents: AgentRow[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  itemsByAgent: Record<string, ChatItem[]>;
  sessionStats: Stats | null;
  git: GitState | null;
  fileTree: FileTreeNode[];
  openFilePath: string | null;
  onOpenFile: (path: string) => void;
}) {
  const [includeFinished, setIncludeFinished] = useState(false);
  const finishedCount = agents.filter((agent) => agent.id && !isAgentActive(agent.status)).length;
  const changeCount =
    (git?.staged?.length ?? 0) + (git?.unstaged?.length ?? 0) + (git?.untracked?.length ?? 0);
  const selected = selectedAgentId ? agents.find((row) => row.id === selectedAgentId) ?? null : null;
  const items = itemsByAgent[selectedAgentId] ?? [];

  if (collapsed) {
    return (
      <aside className="flex h-full min-h-0 w-9 shrink-0 flex-col border-l border-line">
        <button
          type="button"
          onClick={onToggle}
          className="h-full px-2 text-[11px] text-muted [writing-mode:vertical-rl] hover:text-fg"
        >
          Agents · Changes · Files
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-[360px] shrink-0 flex-col overflow-hidden border-l border-line bg-surface">
      <div className="flex items-center border-b border-line">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onTab(entry.id)}
            className={`flex-1 px-2 py-2 text-[12px] ${
              tab === entry.id ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {entry.label}
            {entry.id === "changes" && changeCount ? ` ${changeCount}` : ""}
          </button>
        ))}
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse panel"
          className="px-2 py-2 text-[12px] text-muted hover:text-fg"
        >
          ⟩
        </button>
      </div>

      {tab === "agents" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[12px] text-muted">
              {includeFinished ? "All agents" : "Active agents"}
              {finishedCount ? ` · ${finishedCount} finished` : ""}
            </span>
            <label className="flex items-center gap-1.5 text-[12px] text-muted">
              <input
                type="checkbox"
                checked={includeFinished}
                onChange={(event) => setIncludeFinished(event.target.checked)}
              />
              Show finished
            </label>
          </div>
          <div className="h-[260px] shrink-0 overflow-hidden">
            <AgentGraph
              agents={agents}
              selectedId={selectedAgentId}
              includeFinished={includeFinished}
              onSelect={onSelectAgent}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto border-t border-line p-3">
            <AgentDetail
              agent={selected}
              isRoot={!selectedAgentId}
              items={items}
              sessionStats={sessionStats}
              onOpenFile={onOpenFile}
            />
          </div>
        </div>
      ) : null}

      {tab === "changes" ? (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {changeCount === 0 ? (
            <p className="text-[12px] text-muted">No changed paths yet.</p>
          ) : (
            <div>
              <ChangeGroup label="Staged" paths={git?.staged} onOpen={onOpenFile} />
              <ChangeGroup label="Unstaged" paths={git?.unstaged} onOpen={onOpenFile} />
              <ChangeGroup label="Untracked" paths={git?.untracked} onOpen={onOpenFile} />
            </div>
          )}
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="flex min-h-0 flex-1 flex-col pt-2">
          <FileTree tree={fileTree} selected={openFilePath} onOpen={onOpenFile} />
        </div>
      ) : null}
    </aside>
  );
}

export type InspectTab = Tab;
