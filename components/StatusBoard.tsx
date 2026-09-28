"use client";

import Link from "next/link";

import type { Session } from "@/lib/types";
import { useWorkspace } from "@/lib/useWorkspace";
import {
  BOARD_COLUMNS,
  flattenSessions,
  formatWhen,
  sessionActivity,
  sessionLabel,
  sessionsInColumn,
  type ProjectWithSessions,
} from "@/lib/workspace";

import { StatusDot } from "./StatusDot";

function SessionCard({
  session,
  repo,
}: {
  session: Session;
  repo: string;
}) {
  return (
    <li>
      <Link
        href={`/sessions/${session.id}`}
        className="block border border-line bg-surface px-3 py-2 hover:bg-canvas"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-[13px] text-fg">
            <StatusDot status={session.status} />
            <span className="truncate">{sessionLabel(session)}</span>
          </span>
          <span
            className={`text-[12px] ${
              session.status === "ready"
                ? "text-ok"
                : session.status === "provisioning"
                  ? "text-warn"
                  : session.status === "error"
                    ? "text-danger"
                    : "text-muted"
            }`}
          >
            {sessionActivity(session.status)}
          </span>
        </div>
        <div className="mt-1 truncate text-[12px] text-muted">
          {repo} · {session.branch} · {formatWhen(session.created_at)}
        </div>
        {session.error ? (
          <pre className="mt-2 max-h-16 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-danger">
            {session.error}
          </pre>
        ) : null}
      </Link>
    </li>
  );
}

export function StatusBoard({ projectId }: { projectId?: string }) {
  const { projects, loading } = useWorkspace();
  const project = projectId ? projects.find((row) => row.id === projectId) : undefined;
  const scoped: ProjectWithSessions[] = projectId ? (project ? [project] : []) : projects;
  const sessions = flattenSessions(scoped);
  const missingProject = Boolean(projectId && !loading && !project);
  const repoBySession = new Map(
    scoped.flatMap((row) => row.sessions.map((session) => [session.id, row.full_name] as const)),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-2">
        <h1 className="text-[13px] text-fg">
          {project ? project.full_name : projectId ? "Project" : "All agents"}
        </h1>
        <p className="text-[12px] text-muted">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </p>
      </header>

      {loading ? (
        <p className="px-4 py-8 text-muted">Loading sessions…</p>
      ) : missingProject ? (
        <p className="px-4 py-8 text-muted">This project was not found.</p>
      ) : sessions.length === 0 ? (
        <p className="px-4 py-8 text-muted">
          {project
            ? "No sessions in this project yet. Start an agent from the sidebar."
            : "Start an agent from the sidebar, or add a repository first."}
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-auto bg-line md:grid-cols-3">
          {BOARD_COLUMNS.map((column) => {
            const rows = sessionsInColumn(sessions, column.id);
            return (
              <section key={column.id} className="flex min-h-0 flex-col bg-canvas p-4">
                <h2 className="flex items-center justify-between text-[12px] text-muted">
                  <span>{column.label}</span>
                  <span>{rows.length}</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {rows.length === 0 ? (
                    <li className="text-[12px] text-muted">None</li>
                  ) : (
                    rows.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        repo={repoBySession.get(session.id) ?? session.repo}
                      />
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
