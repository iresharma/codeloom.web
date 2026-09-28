import type { AgentRow, AgentRun, ChatItem, ChatMessage, ChatTool, PendingPrompt, Stats } from "./types";

const VISIBLE_ROLES = new Set(["user", "assistant"]);

export function visibleChatItems(items: ChatItem[]): ChatItem[] {
  return items.filter((item) => {
    if (item.kind === "tool") return true;
    return VISIBLE_ROLES.has(item.role.toLowerCase());
  });
}

export type Activity = {
  label: string;
  tone: "think" | "work" | "wait";
};

export function chatActivity(
  items: ChatItem[],
  agents: AgentRow[],
  selectedAgentId: string,
  pendingPrompt: PendingPrompt | null,
): Activity | null {
  if (pendingPrompt) {
    return { label: "Waiting for input", tone: "wait" };
  }

  const runningTool = [...items].reverse().find((item) => item.kind === "tool" && item.ok === undefined);
  if (runningTool && runningTool.kind === "tool") {
    return { label: `Working · ${toolHeadline(runningTool).title}`, tone: "work" };
  }

  const lastAssistant = [...items]
    .reverse()
    .find((item) => item.kind === "message" && item.role.toLowerCase() === "assistant");
  if (lastAssistant && lastAssistant.kind === "message" && lastAssistant.streaming) {
    return { label: lastAssistant.text.trim() ? "Writing" : "Thinking", tone: "think" };
  }

  const agent = selectedAgentId
    ? agents.find((row) => row.id === selectedAgentId)
    : agents.find((row) => !row.parent_id) ?? agents[0];
  const status = (agent?.status ?? "").toLowerCase();
  if (status === "thinking") return { label: "Thinking", tone: "think" };
  if (status === "running" || status === "working" || status === "tool") {
    const tool = agent?.current_tool ? ` · ${humanToolName(agent.current_tool)}` : "";
    return { label: `Working${tool}`, tone: "work" };
  }
  if (agents.some((row) => row.status === "running" || row.status === "thinking")) {
    return { label: "Working", tone: "work" };
  }
  return null;
}

export function humanToolName(name: string): string {
  const raw = name.trim();
  const key = raw.toLowerCase().replace(/[_\s]+/g, "");
  const labels: Record<string, string> = {
    read: "Read",
    readfile: "Read",
    openfile: "Read",
    write: "Edit",
    writefile: "Edit",
    edit: "Edit",
    strreplace: "Edit",
    applypatch: "Edit",
    bash: "Ran",
    shell: "Ran",
    exec: "Ran",
    run: "Ran",
    grep: "Search",
    search: "Search",
    codebase_search: "Search",
    glob: "Search",
    listdir: "List",
    list_dir: "List",
    webbrowse: "Browse",
    websearch: "Search web",
    ask: "Ask",
    coder: "Coder",
    tester: "Tester",
    researcher: "Researcher",
    debugger: "Debugger",
    reviewer: "Reviewer",
  };
  return labels[key] ?? raw.replace(/[_-]+/g, " ");
}

export const SPAWN_TOOLS = new Set([
  "ask",
  "coder",
  "tester",
  "researcher",
  "debugger",
  "reviewer",
]);

export function isSpawnTool(name: string): boolean {
  return SPAWN_TOOLS.has(name.trim().toLowerCase());
}

export function parseSpawnResult(preview?: string): {
  started: boolean;
  agentId: string;
  profile: string;
  error: string;
} {
  const text = (preview ?? "").trim();
  if (!text) return { started: false, agentId: "", profile: "", error: "" };
  if (/^error:/i.test(text)) {
    return { started: false, agentId: "", profile: "", error: text.replace(/^error:\s*/i, "") };
  }
  return {
    started: /^started\b/i.test(text),
    agentId: /agent_id=([a-f0-9]+)/i.exec(text)?.[1] ?? "",
    profile: /profile=(\S+)/.exec(text)?.[1] ?? "",
    error: "",
  };
}

export function parseAgentReport(text: string): { profile: string; agentId: string; summary: string } | null {
  const match = /^\[agent\s+(\S+)\s+([a-f0-9]+)\s+finished\]\s*/i.exec(text.trim());
  if (!match) return null;
  return {
    profile: match[1],
    agentId: match[2],
    summary: text.trim().slice(match[0].length).trim(),
  };
}

export function matchAgent(agents: AgentRow[], id: string): AgentRow | undefined {
  if (!id) return undefined;
  return (
    agents.find((row) => row.id === id) ??
    agents.find((row) => row.id.startsWith(id) || id.startsWith(row.id))
  );
}

function matchRun(runs: AgentRun[] | undefined, id: string): AgentRun | undefined {
  if (!id || !runs?.length) return undefined;
  return (
    runs.find((row) => row.agent_id === id) ??
    runs.find((row) => row.agent_id.startsWith(id) || id.startsWith(row.agent_id))
  );
}

export type SpawnCard = {
  error: string;
  agentId: string;
  profile: string;
  task: string;
  status: string;
  summary: string;
  tokens?: number;
  cached?: number;
  cost?: number;
  requests?: number;
  durationMs?: number;
  branch?: string;
};

export function spawnCard(
  item: ChatTool,
  agents: AgentRow[],
  stats: Stats | null,
  items: ChatItem[],
): SpawnCard {
  const parsed = parseSpawnResult(item.preview);
  const args = parseArgs(item.arguments_json);
  const task = stringArg(args, ["task"]) ?? "";
  const profile = (parsed.profile || item.name).trim().toLowerCase();
  let agent = matchAgent(agents, parsed.agentId);
  if (!agent && task) {
    const same = agents.filter((row) => row.profile === profile && (row.task || "").trim() === task);
    if (same.length === 1) agent = same[0];
  }
  if (!agent && profile) {
    const same = agents.filter((row) => row.profile === profile && row.id);
    if (same.length === 1) agent = same[0];
  }
  const agentId = agent?.id || parsed.agentId;
  const run = matchRun(stats?.agent_runs, agentId) ?? matchRun(stats?.agent_runs, parsed.agentId);
  let summary = (agent?.summary || "").trim();
  if (!summary && agentId) {
    for (const row of items) {
      if (row.kind !== "message") continue;
      const report = parseAgentReport(row.text);
      if (!report) continue;
      if (agentId.startsWith(report.agentId) || report.agentId.startsWith(agentId.slice(0, report.agentId.length))) {
        summary = report.summary;
        break;
      }
    }
  }
  return {
    error: parsed.error,
    agentId,
    profile,
    task,
    status: parsed.error
      ? "error"
      : agent?.run_status || agent?.status || (item.ok === undefined ? "running" : run ? "ok" : "started"),
    summary,
    tokens: agent?.total_tokens ?? run?.total_tokens,
    cached: agent?.cached_tokens ?? run?.cached_tokens,
    cost: agent?.cost ?? run?.cost,
    requests: agent?.requests ?? run?.requests,
    durationMs: agent?.duration_ms,
    branch: agent?.branch,
  };
}

export function toolHeadline(item: ChatTool): { title: string; detail: string } {
  const verb = humanToolName(item.name);
  const args = parseArgs(item.arguments_json);
  if (isSpawnTool(item.name)) {
    const task = stringArg(args, ["task"]) ?? "";
    const short = task.length > 72 ? `${task.slice(0, 69)}…` : task;
    return { title: short ? `${verb} · ${short}` : verb, detail: task };
  }
  const path = stringArg(args, ["path", "file", "filepath", "target"]);
  const command = stringArg(args, ["command", "cmd", "script"]);
  const query = stringArg(args, ["query", "pattern", "search", "q"]);
  const detail = path || command || query || "";
  const short = detail.length > 72 ? `${detail.slice(0, 69)}…` : detail;
  return {
    title: short ? `${verb} ${fileName(short)}` : verb,
    detail: short,
  };
}

function fileName(value: string): string {
  if (value.includes(" ") && !value.includes("/")) return value;
  const parts = value.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? value;
}

export function parseArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function stringArg(args: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function isUserMessage(item: ChatItem): item is ChatMessage {
  return item.kind === "message" && item.role.toLowerCase() === "user";
}

export function isAssistantMessage(item: ChatItem): item is ChatMessage {
  return item.kind === "message" && item.role.toLowerCase() === "assistant";
}
