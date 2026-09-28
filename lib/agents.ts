import { matchAgent, parseAgentReport, toolHeadline } from "./chat";
import type { AgentRow, AgentRun, ChatItem, ChatTool, Stats } from "./types";

export const ORCHESTRATOR_ID = "";
export const ORCHESTRATOR_NODE = "orchestrator";

const ACTIVE = new Set(["running", "thinking", "working", "tool", "streaming", "waiting"]);

export function isAgentActive(status: string): boolean {
  return ACTIVE.has(status.toLowerCase());
}

export function mergeAgents(current: AgentRow[], incoming: AgentRow[]): AgentRow[] {
  const live = new Set(incoming.map((row) => row.id).filter(Boolean));
  const map = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    if (!row.id) continue;
    map.set(row.id, { ...map.get(row.id), ...row });
  }
  for (const [id, row] of map) {
    if (!live.has(id) && isAgentActive(row.status)) {
      map.set(id, { ...row, status: "finished", current_tool: undefined });
    }
  }
  return [...map.values()];
}

export function upsertAgent(current: AgentRow[], next: AgentRow): AgentRow[] {
  if (!next.id) return current;
  const exists = current.some((row) => row.id === next.id);
  return exists
    ? current.map((row) => (row.id === next.id ? { ...row, ...next } : row))
    : [...current, next];
}

export function applyAgentRuns(agents: AgentRow[], runs?: AgentRun[]): AgentRow[] {
  if (!runs?.length) return agents;
  let next = agents;
  for (const run of runs) {
    const id = run.agent_id;
    if (!id) continue;
    const existing = matchAgent(next, id);
    next = upsertAgent(next, {
      id: existing?.id || id,
      role: existing?.role ?? "child",
      profile: existing?.profile || run.profile || "agent",
      status: existing && isAgentActive(existing.status) ? existing.status : "finished",
      parent_id: existing?.parent_id,
      task: existing?.task,
      branch: existing?.branch,
      worktree: existing?.worktree,
      run_status: existing?.run_status,
      summary: existing?.summary,
      started_at: existing?.started_at,
      duration_ms: existing?.duration_ms,
      cost: run.cost ?? existing?.cost,
      prompt_tokens: run.prompt_tokens ?? existing?.prompt_tokens,
      cached_tokens: run.cached_tokens ?? existing?.cached_tokens,
      total_tokens: run.total_tokens ?? existing?.total_tokens,
      requests: run.requests ?? existing?.requests,
    });
  }
  return next;
}

export function hydrateAgents(agents: AgentRow[], stats: Stats | null, itemsByAgent: Record<string, ChatItem[]>): AgentRow[] {
  let next = applyAgentRuns(agents, stats?.agent_runs);
  for (const items of Object.values(itemsByAgent)) {
    for (const item of items) {
      if (item.kind === "message") next = applyAgentReport(next, item.text);
    }
  }
  return next;
}

export function applyAgentReport(agents: AgentRow[], text: string): AgentRow[] {
  const report = parseAgentReport(text);
  if (!report) return agents;
  const existing = matchAgent(agents, report.agentId);
  const id = existing?.id || report.agentId;
  if (!id) return agents;
  return upsertAgent(agents, {
    id,
    role: existing?.role ?? "child",
    profile: existing?.profile || report.profile || "agent",
    status: existing && isAgentActive(existing.status) ? existing.status : "finished",
    parent_id: existing?.parent_id,
    task: existing?.task,
    branch: existing?.branch,
    worktree: existing?.worktree,
    run_status: existing?.run_status || "ok",
    summary: report.summary || existing?.summary,
    started_at: existing?.started_at,
    duration_ms: existing?.duration_ms,
    cost: existing?.cost,
    prompt_tokens: existing?.prompt_tokens,
    cached_tokens: existing?.cached_tokens,
    total_tokens: existing?.total_tokens,
    requests: existing?.requests,
  });
}

export function nodeIdForAgent(id: string): string {
  return id || ORCHESTRATOR_NODE;
}

export function agentIdForNode(id: string): string {
  return id === ORCHESTRATOR_NODE ? ORCHESTRATOR_ID : id;
}

export type AgentStats = {
  prompt: string;
  tools: ChatTool[];
  files: string[];
  toolCount: number;
  runningTools: number;
  failedTools: number;
  durationMs: number;
  tokens?: number;
  cost?: number;
  turns?: number;
};

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toolPath(item: ChatTool): string | null {
  const args = parseArgs(item.arguments_json);
  for (const key of ["path", "file", "filepath", "target"]) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function agentStats(
  agent: AgentRow | null,
  items: ChatItem[],
  sessionStats: Stats | null,
  isRoot: boolean,
): AgentStats {
  const tools = items.filter((item): item is ChatTool => item.kind === "tool");
  const files = [...new Set(tools.map(toolPath).filter((path): path is string => Boolean(path)))];
  const user = items.find((item) => item.kind === "message" && item.role === "user");
  const prompt = agent?.task?.trim() || (user && user.kind === "message" ? user.text : "");
  const run = agent?.id
    ? sessionStats?.agent_runs?.find(
        (row) => row.agent_id === agent.id || row.agent_id.startsWith(agent.id) || agent.id.startsWith(row.agent_id),
      )
    : undefined;
  return {
    prompt,
    tools,
    files,
    toolCount: tools.length,
    runningTools: tools.filter((tool) => tool.ok === undefined).length,
    failedTools: tools.filter((tool) => tool.ok === false).length,
    durationMs: agent?.duration_ms ?? tools.reduce((sum, tool) => sum + (tool.duration_ms ?? 0), 0),
    tokens: isRoot ? sessionStats?.total_tokens : (agent?.total_tokens ?? run?.total_tokens),
    cost: isRoot ? sessionStats?.cost : (agent?.cost ?? run?.cost),
    turns: isRoot ? sessionStats?.turns : (agent?.requests ?? run?.requests),
  };
}

export type LaidOutNode = {
  id: string;
  agentId: string;
  title: string;
  status: string;
  detail: string;
  column: number;
  row: number;
};

type TreeNode = {
  id: string;
  agentId: string;
  title: string;
  status: string;
  detail: string;
  children: TreeNode[];
  span: number;
};

function visibleAgents(agents: AgentRow[], includeFinished: boolean): AgentRow[] {
  return agents.filter((agent) => agent.id && (includeFinished || isAgentActive(agent.status)));
}

function sortAgents(left: AgentRow, right: AgentRow): number {
  const live = Number(isAgentActive(right.status)) - Number(isAgentActive(left.status));
  if (live) return live;
  return (left.profile || left.role || left.id).localeCompare(right.profile || right.role || right.id);
}

function measure(node: TreeNode): number {
  node.span = node.children.length
    ? node.children.reduce((sum, child) => sum + measure(child), 0)
    : 1;
  return node.span;
}

function place(node: TreeNode, depth: number, start: number, out: LaidOutNode[]) {
  out.push({
    id: node.id,
    agentId: node.agentId,
    title: node.title,
    status: node.status,
    detail: node.detail,
    column: depth,
    row: start + (node.span - 1) / 2,
  });
  let cursor = start;
  for (const child of node.children) {
    place(child, depth + 1, cursor, out);
    cursor += child.span;
  }
}

export function layoutAgents(agents: AgentRow[], includeFinished: boolean): LaidOutNode[] {
  const children = visibleAgents(agents, includeFinished);
  const visible = new Set(children.map((agent) => agent.id));
  const byParent = new Map<string, AgentRow[]>();
  for (const agent of children) {
    const parent = agent.parent_id && visible.has(agent.parent_id) ? agent.parent_id : ORCHESTRATOR_ID;
    const list = byParent.get(parent) ?? [];
    list.push(agent);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) list.sort(sortAgents);

  function toNode(agent: AgentRow): TreeNode {
    return {
      id: nodeIdForAgent(agent.id),
      agentId: agent.id,
      title: agent.profile || agent.role || "agent",
      status: agent.status,
      detail: agent.current_tool || agent.task || agent.branch || "",
      children: (byParent.get(agent.id) ?? []).map(toNode),
      span: 1,
    };
  }

  const root: TreeNode = {
    id: ORCHESTRATOR_NODE,
    agentId: ORCHESTRATOR_ID,
    title: "Orchestrator",
    status: children.some((agent) => isAgentActive(agent.status)) ? "running" : "idle",
    detail: "root",
    children: (byParent.get(ORCHESTRATOR_ID) ?? []).map(toNode),
    span: 1,
  };
  measure(root);
  const rows: LaidOutNode[] = [];
  place(root, 0, 0, rows);
  return rows;
}

export function formatDuration(ms: number): string {
  if (!ms) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

export function formatCost(cost: number | undefined): string {
  if (cost == null) return "—";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function formatTokens(value: number | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

export { toolHeadline };
