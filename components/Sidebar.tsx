"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useWorkspace } from "@/lib/useWorkspace";
import type { User } from "@/lib/types";
import { formatWhen, projectForSession, shortId } from "@/lib/workspace";

import { AddRepoPanel } from "./AddRepoPanel";
import { StatusDot } from "./StatusDot";

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { projects, startSession, busy, error, loading } = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
    <aside className="relative flex h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden border-r border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
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

      <nav className="min-h-0 flex-1 overflow-auto px-2 py-2" aria-label="Projects and sessions">
        {loading ? (
          <p className="px-1 py-2 text-muted">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="px-1 py-2 text-muted">Add a GitHub repository to start an agent.</p>
        ) : (
          projects.map((project) => {
            const hidden = collapsed[project.id];
            const projectActive = selectedProjectId === project.id;
            return (
              <section key={project.id} className="mb-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-expanded={!hidden}
                    onClick={() =>
                      setCollapsed((current) => ({ ...current, [project.id]: !current[project.id] }))
                    }
                    className="px-1 text-[11px] text-muted hover:text-fg"
                  >
                    {hidden ? "▸" : "▾"}
                    <span className="sr-only">Toggle {project.full_name}</span>
                  </button>
                  <Link
                    href={`/projects/${project.id}`}
                    className={`min-w-0 flex-1 truncate px-1 py-1 ${
                      projectActive ? "text-fg" : "text-muted hover:text-fg"
                    }`}
                  >
                    {project.full_name}
                  </Link>
                </div>
                {hidden ? null : (
                  <ul className="ml-3 border-l border-line">
                    {project.sessions.length === 0 ? (
                      <li className="px-2 py-1 text-[12px] text-muted">No sessions</li>
                    ) : (
                      project.sessions.map((session) => {
                        const active = session.id === activeSessionId;
                        return (
                          <li key={session.id}>
                            <Link
                              href={`/sessions/${session.id}`}
                              className={`flex items-center gap-2 px-2 py-1.5 ${
                                active ? "bg-canvas text-fg" : "text-muted hover:bg-canvas hover:text-fg"
                              }`}
                            >
                              <StatusDot status={session.status} />
                              <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
                                {session.branch} · {shortId(session.id)}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted">
                                {formatWhen(session.created_at)}
                              </span>
                            </Link>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </section>
            );
          })
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
