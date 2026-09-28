import type { Project, Session } from "./types";

export type ProjectWithSessions = Project & { sessions: Session[] };

export type BoardColumnId = "working" | "attention" | "finished";

export type BoardColumn = {
  id: BoardColumnId;
  label: string;
  statuses: string[];
};

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: "working", label: "Working", statuses: ["provisioning", "ready"] },
  { id: "attention", label: "Attention", statuses: ["error"] },
  { id: "finished", label: "Finished", statuses: ["stopped"] },
];

export function columnForStatus(status: string): BoardColumnId | null {
  const column = BOARD_COLUMNS.find((entry) => entry.statuses.includes(status));
  return column?.id ?? null;
}

export function sessionsInColumn(
  sessions: Session[],
  column: BoardColumnId,
): Session[] {
  const statuses = BOARD_COLUMNS.find((entry) => entry.id === column)?.statuses ?? [];
  return sessions
    .filter((session) => statuses.includes(session.status))
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function flattenSessions(projects: ProjectWithSessions[]): Session[] {
  return projects.flatMap((project) => project.sessions);
}

export function projectForSession(
  projects: ProjectWithSessions[],
  sessionId: string,
): ProjectWithSessions | undefined {
  return projects.find((project) =>
    project.sessions.some((session) => session.id === sessionId),
  );
}

export function findSession(
  projects: ProjectWithSessions[],
  sessionId: string,
): Session | undefined {
  for (const project of projects) {
    const session = project.sessions.find((row) => row.id === sessionId);
    if (session) return session;
  }
  return undefined;
}

export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

export function isSessionLive(status: string): boolean {
  return status === "ready" || status === "provisioning";
}

export function sessionActivity(status: string): string {
  if (status === "ready") return "live";
  if (status === "provisioning") return "starting";
  if (status === "error") return "error";
  return "stopped";
}

export function clipTitle(text: string, limit = 120): string {
  const stripped = text.trim();
  if (!stripped) return "";
  const line = (stripped.split("\n")[0] ?? "").replace(/\s+/g, " ").trim();
  if (line.length <= limit) return line;
  let cut = line.slice(0, limit - 1);
  const space = cut.lastIndexOf(" ");
  if (space >= 40) cut = cut.slice(0, space);
  return `${cut.replace(/[.,;:—-]+$/, "")}…`;
}

export function sessionLabel(session: { title?: string | null; status: string }): string {
  const title = session.title?.trim();
  if (title) return title;
  if (session.status === "ready" || session.status === "provisioning") return "New agent";
  return "Untitled run";
}

export function sessionBadge(status: string): { label: string; className: string } | null {
  if (status === "ready") return { label: "Live", className: "text-ok" };
  if (status === "provisioning") return { label: "Starting", className: "text-warn" };
  if (status === "error") return { label: "Error", className: "text-danger" };
  return null;
}

export type ThreadGroupId = "working" | "attention" | "settled";

export type SessionThread = {
  session: Session;
  project: ProjectWithSessions;
};

export function threadGroup(status: string): ThreadGroupId {
  if (status === "ready" || status === "provisioning") return "working";
  if (status === "error") return "attention";
  return "settled";
}

export function groupThreads(projects: ProjectWithSessions[]): {
  id: ThreadGroupId;
  label: string;
  threads: SessionThread[];
}[] {
  const threads: SessionThread[] = projects.flatMap((project) =>
    project.sessions.map((session) => ({ session, project })),
  );
  const sort = (rows: SessionThread[]) =>
    rows.slice().sort((a, b) => b.session.created_at.localeCompare(a.session.created_at));
  const groups: { id: ThreadGroupId; label: string; threads: SessionThread[] }[] = [
    { id: "working", label: "Working", threads: sort(threads.filter((row) => threadGroup(row.session.status) === "working")) },
    { id: "attention", label: "Attention", threads: sort(threads.filter((row) => threadGroup(row.session.status) === "attention")) },
    { id: "settled", label: "Settled", threads: sort(threads.filter((row) => threadGroup(row.session.status) === "settled")) },
  ];
  return groups.filter((group) => group.threads.length > 0);
}

export function threadMatches(thread: SessionThread, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    sessionLabel(thread.session),
    thread.project.full_name,
    thread.session.branch,
    thread.session.status,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function statusTone(status: string): "moss" | "warn" | "copper" | "mute" {
  if (status === "ready") return "moss";
  if (status === "provisioning") return "warn";
  if (status === "error") return "copper";
  return "mute";
}

const NAIVE_STAMP =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/;

export function parseStamp(iso: string): Date {
  const trimmed = (iso || "").trim();
  if (!trimmed) return new Date(Number.NaN);
  const match = trimmed.match(NAIVE_STAMP);
  if (match && !match[3]) {
    return new Date(`${match[1]}T${match[2]}Z`);
  }
  return new Date(trimmed);
}

export function formatWhen(iso: string, now = Date.now()): string {
  const date = parseStamp(iso);
  if (Number.isNaN(date.getTime())) return "";
  const delta = now - date.getTime();
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatSpan(start: string, end: string | null, now = Date.now()): string {
  const from = parseStamp(start).getTime();
  const to = end ? parseStamp(end).getTime() : now;
  if (Number.isNaN(from) || Number.isNaN(to)) return "";
  const minutes = Math.max(0, Math.round((to - from) / 60_000));
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 48) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
