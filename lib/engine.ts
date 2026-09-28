import { applyAgentReport, applyAgentRuns, mergeAgents, upsertAgent } from "./agents";
import { readChoices } from "./prompt";
import type {
  AgentRow,
  ChatItem,
  ChatMessage,
  EngineEvent,
  FileTreeNode,
  GitState,
  PendingPrompt,
  Stats,
} from "./types";

function pendingFrom(source: Record<string, unknown> | null | undefined): PendingPrompt | null {
  if (!source) return null;
  const promptId = source.prompt_id ?? source.id;
  const question = source.question ?? source.message ?? source.text;
  if (promptId == null && (question == null || question === "")) return null;
  return {
    prompt_id: String(promptId ?? ""),
    question: String(question ?? ""),
    kind: String(source.kind ?? ""),
    choices: readChoices(source),
    default: typeof source.default === "string" ? source.default : null,
  };
}

export type EngineState = {
  itemsByAgent: Record<string, ChatItem[]>;
  agents: AgentRow[];
  selectedAgentId: string;
  fileTree: FileTreeNode[];
  openFile: { path: string; content: string; original?: string | null } | null;
  pendingPrompt: PendingPrompt | null;
  answeredPromptIds: string[];
  git: GitState | null;
  editedPaths: string[];
  stats: Stats | null;
  error: string | null;
};

export const initialEngineState: EngineState = {
  itemsByAgent: { "": [] },
  agents: [],
  selectedAgentId: "",
  fileTree: [],
  openFile: null,
  pendingPrompt: null,
  answeredPromptIds: [],
  git: null,
  editedPaths: [],
  stats: null,
  error: null,
};

function promptKey(prompt: Pick<PendingPrompt, "prompt_id" | "question">): string {
  return prompt.prompt_id || prompt.question;
}

function wasAnswered(state: EngineState, prompt: PendingPrompt | null): boolean {
  if (!prompt) return false;
  return state.answeredPromptIds.includes(promptKey(prompt));
}

export function dismissPrompt(state: EngineState, prompt: PendingPrompt): EngineState {
  const key = promptKey(prompt);
  return {
    ...state,
    pendingPrompt: state.pendingPrompt && promptKey(state.pendingPrompt) === key ? null : state.pendingPrompt,
    answeredPromptIds: state.answeredPromptIds.includes(key)
      ? state.answeredPromptIds
      : [...state.answeredPromptIds, key],
  };
}

function agentKey(event: EngineEvent): string {
  return typeof event.agent_id === "string" ? event.agent_id : "";
}

function num(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function int(value: unknown, fallback?: number): number | undefined {
  const next = num(value, fallback);
  return next == null ? undefined : Math.round(next);
}

function itemsFor(state: EngineState, agentId: string): ChatItem[] {
  return state.itemsByAgent[agentId] ?? [];
}

export function itemsForAgent(itemsByAgent: Record<string, ChatItem[]>, agentId: string): ChatItem[] {
  const exact = itemsByAgent[agentId];
  if ((exact && exact.length > 0) || !agentId) return exact ?? [];
  const matches = Object.keys(itemsByAgent).filter(
    (key) => key && key !== agentId && (key.startsWith(agentId) || agentId.startsWith(key)),
  );
  if (matches.length === 1) return itemsByAgent[matches[0]] ?? [];
  return exact ?? [];
}

function setItems(state: EngineState, agentId: string, items: ChatItem[]): EngineState {
  return {
    ...state,
    itemsByAgent: { ...state.itemsByAgent, [agentId]: items },
  };
}

function upsertMessage(
  items: ChatItem[],
  next: ChatMessage,
  replaceStreaming: boolean,
): ChatItem[] {
  const index = items.findIndex((item) => item.kind === "message" && item.id === next.id);
  if (index === -1) {
    return [...items, next];
  }
  const copy = items.slice();
  const current = copy[index];
  if (current.kind !== "message") {
    copy[index] = next;
    return copy;
  }
  copy[index] = replaceStreaming
    ? next
    : { ...current, ...next, text: next.text || current.text };
  return copy;
}

export function reduceEngine(state: EngineState, event: EngineEvent): EngineState {
  const type = event.type;
  const agentId = agentKey(event);

  if (type === "SnapshotReady") {
    const snapshot = (event.snapshot ?? {}) as Record<string, unknown>;
    const incomingAgents = Array.isArray(snapshot.agents) ? (snapshot.agents as AgentRow[]) : null;
    const agents =
      incomingAgents && (incomingAgents.length > 0 || state.agents.length === 0)
        ? mergeAgents(state.agents, incomingAgents)
        : state.agents;
    const pending = pendingFrom(
      snapshot.pending_prompt && typeof snapshot.pending_prompt === "object"
        ? (snapshot.pending_prompt as Record<string, unknown>)
        : null,
    );
    const nextPending = wasAnswered(state, pending)
      ? null
      : pending ?? (wasAnswered(state, state.pendingPrompt) ? null : state.pendingPrompt);
    const stats = (snapshot.stats as Stats) ?? state.stats;
    return {
      ...state,
      agents: applyAgentRuns(agents, stats?.agent_runs),
      git: (snapshot.git as GitState) ?? state.git,
      stats,
      pendingPrompt: nextPending,
      error: null,
    };
  }

  if (type === "ChatMessageStarted") {
    const id = String(event.id ?? "");
    return setItems(
      state,
      agentId,
      upsertMessage(
        itemsFor(state, agentId),
        { kind: "message", id, role: String(event.role ?? "assistant"), text: "", streaming: true },
        false,
      ),
    );
  }

  if (type === "ChatMessageDelta") {
    const id = String(event.id ?? "");
    const delta = String(event.text ?? "");
    const items = itemsFor(state, agentId).map((item) => {
      if (item.kind === "message" && item.id === id) {
        return { ...item, text: item.text + delta, streaming: true };
      }
      return item;
    });
    return setItems(state, agentId, items);
  }

  if (type === "ChatMessageAdded" || type === "ChatHistoryAdded") {
    const id = String(event.id ?? "");
    const text = String(event.text ?? "");
    // A transcript replay starts at index 0. Replace that agent's items
    // instead of appending onto a cleared list (which flashes the new-chat
    // empty state) or onto a previous replay.
    const prior =
      type === "ChatHistoryAdded" && Number(event.index) === 0
        ? []
        : itemsFor(state, agentId);
    const next = setItems(
      state,
      agentId,
      upsertMessage(
        prior,
        {
          kind: "message",
          id,
          role: String(event.role ?? "assistant"),
          text,
          streaming: false,
        },
        true,
      ),
    );
    return { ...next, agents: applyAgentReport(next.agents, text) };
  }

  if (type === "ChatHistoryComplete") {
    return state;
  }

  if (type === "ToolCallStarted") {
    const callId = String(event.call_id ?? "");
    const items = itemsFor(state, agentId);
    if (items.some((item) => item.kind === "tool" && item.call_id === callId)) {
      return state;
    }
    return setItems(state, agentId, [
      ...items,
      {
        kind: "tool",
        call_id: callId,
        name: String(event.name ?? "tool"),
        arguments_json: String(event.arguments_json ?? ""),
      },
    ]);
  }

  if (type === "ToolCallFinished") {
    const callId = String(event.call_id ?? "");
    const preview = String(event.preview ?? "");
    const items = itemsFor(state, agentId).map((item) => {
      if (item.kind === "tool" && item.call_id === callId) {
        return {
          ...item,
          preview,
          ok: Boolean(event.ok),
          duration_ms: Number(event.duration_ms ?? 0),
        };
      }
      return item;
    });
    return setItems(state, agentId, items);
  }

  if (type === "AgentsUpdated") {
    const agents = Array.isArray(event.agents)
      ? mergeAgents(state.agents, event.agents as AgentRow[])
      : state.agents;
    return { ...state, agents: applyAgentRuns(agents, state.stats?.agent_runs) };
  }

  if (type === "AgentStarted") {
    const id = String(event.agent_id ?? "");
    if (!id) return state;
    const next: AgentRow = {
      id,
      role: "child",
      profile: String(event.profile ?? "agent"),
      status: "running",
      parent_id: typeof event.parent_id === "string" ? event.parent_id : "",
      task: typeof event.task === "string" ? event.task : "",
      worktree: typeof event.worktree === "string" ? event.worktree : "",
      branch: typeof event.branch === "string" ? event.branch : "",
      started_at: Date.now(),
    };
    return { ...state, agents: upsertAgent(state.agents, next) };
  }

  if (type === "AgentFinished") {
    const id = String(event.agent_id ?? "");
    if (!id) return state;
    const existing = state.agents.find((row) => row.id === id);
    const next: AgentRow = {
      id,
      role: existing?.role ?? "child",
      profile: existing?.profile ?? String(event.profile ?? "agent"),
      status: "finished",
      parent_id: existing?.parent_id ?? (typeof event.parent_id === "string" ? event.parent_id : ""),
      task: existing?.task ?? (typeof event.task === "string" ? event.task : ""),
      branch: existing?.branch,
      worktree: existing?.worktree,
      run_status: String(event.status ?? existing?.run_status ?? ""),
      summary: String(event.summary ?? existing?.summary ?? ""),
      cost: num(event.cost, existing?.cost),
      prompt_tokens: int(event.prompt_tokens, existing?.prompt_tokens),
      cached_tokens: int(event.cached_tokens, existing?.cached_tokens),
      total_tokens: int(event.total_tokens, existing?.total_tokens),
      requests: int(event.requests, existing?.requests),
      started_at: existing?.started_at,
      duration_ms:
        existing?.started_at != null ? Math.max(0, Date.now() - existing.started_at) : existing?.duration_ms,
    };
    return {
      ...state,
      agents: applyAgentRuns(upsertAgent(state.agents, next), state.stats?.agent_runs),
    };
  }

  if (type === "AgentStateChanged") {
    const id = String(event.agent_id ?? "");
    return {
      ...state,
      agents: state.agents.map((row) =>
        row.id === id ? { ...row, status: String(event.state ?? row.status) } : row,
      ),
    };
  }

  if (type === "FileTreeUpdated") {
    const fileTree = Array.isArray(event.file_tree) ? (event.file_tree as FileTreeNode[]) : [];
    return { ...state, fileTree };
  }

  if (type === "FileContent") {
    const original = event.original;
    return {
      ...state,
      openFile: {
        path: String(event.path ?? ""),
        content: String(event.content ?? ""),
        original: typeof original === "string" ? original : null,
      },
    };
  }

  if (type === "FileEdited") {
    const path = String(event.path ?? "").trim();
    const edited = state.editedPaths ?? [];
    if (!path || edited.includes(path)) return state;
    return { ...state, editedPaths: [...edited, path] };
  }

  if (type === "GitStateUpdated") {
    return { ...state, git: (event.git as GitState) ?? state.git };
  }

  if (type === "StatsUpdated") {
    const stats = (event.stats as Stats) ?? state.stats;
    return { ...state, stats, agents: applyAgentRuns(state.agents, stats?.agent_runs) };
  }

  if (type === "UserPromptRequested") {
    const pending = pendingFrom(event);
    if (wasAnswered(state, pending)) return state;
    return {
      ...state,
      pendingPrompt: pending ?? state.pendingPrompt,
    };
  }

  if (
    type === "UserPromptAnswered" ||
    type === "UserPromptResolved" ||
    type === "UserPromptCleared" ||
    type === "PromptAnswered"
  ) {
    const pending = pendingFrom(event);
    if (pending) return dismissPrompt(state, pending);
    return { ...state, pendingPrompt: null };
  }

  if (type === "ErrorOccurred") {
    return { ...state, error: String(event.message ?? "engine error") };
  }

  return state;
}

