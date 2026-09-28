"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useWorkspace } from "@/lib/useWorkspace";
import type { Session, User } from "@/lib/types";
import {
  formatWhen,
  projectForSession,
  sessionBadge,
  sessionLabel,
  shortId,
  threadMatches,
  type ProjectWithSessions,
} from "@/lib/workspace";

import { AddRepoPanel } from "./AddRepoPanel";

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { projects, startSession, removeSession, busy, error, loading } = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeSessionId = pathname.startsWith("/sessions/")
    ? pathname.slice("/sessions/".length).split("/")[0]
    : null;
  const activeProjectId = pathname.startsWith("/projects/")
    ? pathname.slice("/projects/".length).split("/")[0]
    : null;

  const selectedProjectId = useMemo(() => {
    if (activeProjectId) return activeProjectId;
    if (activeSessionId) {
      return projectForSession(projects, activeSessionId)?.id ?? null;
    }
    return projects[0]?.id ?? null;
  }, [activeProjectId, activeSessionId, projects]);

  const visible = useMemo(() => {
    return projects
      .map((project) => ({
        project,
        sessions: project.sessions.filter((session) =>
          threadMatches({ session, project }, query),
        ),
      }))
      .filter((row) => !query || row.sessions.length > 0);
  }, [projects, query]);

  async function removeRun(session: Session) {
    const live = session.status === "ready" || session.status === "provisioning";
    const ok = window.confirm(live ? "Stop and delete this run?" : "Delete this run?");
    if (!ok) return;
    setDeletingId(session.id);
    try {
      await removeSession(session.id);
      if (activeSessionId === session.id) {
        router.push(`/projects/${session.project_id}`);
      }
    } catch {
      // surfaced on the workspace error line
    } finally {
      setDeletingId(null);
    }
  }

  async function newAgent() {
    if (!selectedProjectId) {
      setAddOpen(true);
      return;
    }
    try {
      const session = await startSession(selectedProjectId);
      router.push(`/sessions/${session.id}`);
    } catch {
      // surfaced on the workspace error line
    }
  }

  return (
    <aside className="relative flex h-full min-h-0 w-72 max-w-72 shrink-0 flex-col overflow-hidden border-r border-line bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <Link href="/projects" className="truncate text-[13px] text-fg">
          CodeLoom
        </Link>
        <button
          type="button"
          onClick={() => void newAgent()}
          disabled={Boolean(busy)}
          className="border border-line px-2 py-1 text-[12px] text-fg hover:bg-canvas disabled:opacity-40"
        >
          {busy && selectedProjectId && busy === selectedProjectId ? "Starting" : "New agent"}
        </button>
      </div>

      <div className="px-3 pb-2">
        <label className="sr-only" htmlFor="thread-search">
          Search runs
        </label>
        <input
          id="thread-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="w-full border border-line bg-canvas px-2.5 py-1.5 text-[12px] text-fg outline-none placeholder:text-muted focus:border-muted"
        />
      </div>

      <nav className="min-h-0 flex-1 overflow-auto px-2 pb-2" aria-label="Projects and sessions">
        {loading ? (
          <p className="px-1 py-2 text-muted">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="px-1 py-2 text-muted">Add a GitHub repository to start an agent.</p>
        ) : visible.every((row) => row.sessions.length === 0) ? (
          <p className="px-1 py-2 text-muted">
            {query ? "No runs match that search." : "Start an agent to open a run."}
          </p>
        ) : (
          visible.map(({ project, sessions }) => (
            <RepoGroup
              key={project.id}
              project={project}
              sessions={sessions}
              collapsed={Boolean(collapsed[project.id]) && !query}
              selected={selectedProjectId === project.id}
              activeSessionId={activeSessionId}
              deletingId={deletingId}
              onDelete={(session) => void removeRun(session)}
              onToggle={() =>
                setCollapsed((current) => ({ ...current, [project.id]: !current[project.id] }))
              }
            />
          ))
        )}
        {error ? <p className="px-1 pt-2 text-[12px] text-danger">{error}</p> : null}
      </nav>

      <div className="border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={() => setAddOpen((open) => !open)}
          className="w-full text-left text-[12px] text-muted hover:text-fg"
        >
          Add repository
        </button>
        <div className="mt-1 truncate text-[12px] text-muted">{user.login}</div>
      </div>

      <AddRepoPanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(projectId) => router.push(`/projects/${projectId}`)}
      />
    </aside>
  );
}

function RepoGroup({
  project,
  sessions,
  collapsed,
  selected,
  activeSessionId,
  deletingId,
  onDelete,
  onToggle,
}: {
  project: ProjectWithSessions;
  sessions: Session[];
  collapsed: boolean;
  selected: boolean;
  activeSessionId: string | null;
  deletingId: string | null;
  onDelete: (session: Session) => void;
  onToggle: () => void;
}) {
  return (
    <section className="mb-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="px-1 text-[11px] text-muted hover:text-fg"
        >
          {collapsed ? "▸" : "▾"}
          <span className="sr-only">Toggle {project.full_name}</span>
        </button>
        <Link
          href={`/projects/${project.id}`}
          className={`min-w-0 flex-1 truncate px-1 py-1 text-[12px] ${
            selected ? "text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {project.full_name}
        </Link>
      </div>
      {collapsed ? null : sessions.length === 0 ? (
        <p className="ml-3 border-l border-line px-2 py-1 text-[12px] text-muted">No sessions</p>
      ) : (
        <ul className="ml-3 border-l border-line">
          {sessions.map((session) => (
            <ThreadRow
              key={session.id}
              session={session}
              selected={session.id === activeSessionId}
              deleting={deletingId === session.id}
              onDelete={() => onDelete(session)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ThreadRow({
  session,
  selected,
  deleting,
  onDelete,
}: {
  session: Session;
  selected: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const badge = sessionBadge(session.status);
  const when = formatWhen(session.created_at);
  const title = sessionLabel(session);
  const untitled = !session.title?.trim();
  return (
    <li className="group relative">
      <Link
        href={`/sessions/${session.id}`}
        aria-current={selected ? "page" : undefined}
        title={title}
        className={`block px-2 py-1 ${selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[13px] leading-5 text-fg">{title}</span>
          <span
            className={`shrink-0 text-[11px] group-hover:invisible group-has-[button:focus]:invisible ${
              badge ? badge.className : "text-muted"
            }`}
          >
            {badge ? badge.label : when}
          </span>
        </div>
        <div className="truncate font-mono text-[11px] leading-4 text-muted">
          {session.branch}
          {untitled ? ` · ${shortId(session.id)}` : ""}
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${title}`}
        disabled={deleting}
        onClick={onDelete}
        className="pointer-events-none absolute right-1.5 top-1 px-1 text-[11px] text-muted opacity-0 hover:text-danger focus:pointer-events-auto focus:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 disabled:opacity-40"
      >
        {deleting ? "…" : "Delete"}
      </button>
    </li>
  );
}
