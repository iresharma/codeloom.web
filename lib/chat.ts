import type { AgentRow, ChatItem, ChatMessage, ChatTool, PendingPrompt } from "./types";

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

  const streaming = [...items].reverse().find((item) => item.kind === "message" && item.streaming);
  if (streaming && streaming.kind === "message") {
    return { label: streaming.text.trim() ? "Writing" : "Thinking", tone: "think" };
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
  };
  return labels[key] ?? raw.replace(/[_-]+/g, " ");
}

export function toolHeadline(item: ChatTool): { title: string; detail: string } {
  const verb = humanToolName(item.name);
  const args = parseArgs(item.arguments_json);
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
