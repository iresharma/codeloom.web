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

export function statusTone(status: string): "moss" | "warn" | "copper" | "mute" {
  if (status === "ready") return "moss";
  if (status === "provisioning") return "warn";
  if (status === "error") return "copper";
  return "mute";
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const delta = Date.now() - date.getTime();
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
