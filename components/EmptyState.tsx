"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useWorkspace } from "@/lib/useWorkspace";
import type { Project, Repo } from "@/lib/types";

import { RepoGlance } from "./RepoGlance";

export function EmptyState({ project }: { project?: Project }) {
  const { projects } = useWorkspace();

  if (project) {
    return <StartAgent projects={[project]} />;
  }
  if (projects.length === 0) {
    return <AddRepository />;
  }
  return <StartAgent projects={projects} />;
}

function AddRepository() {
  const router = useRouter();
  const { repos, addRepo, busy, error } = useWorkspace();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos.filter((repo) => !q || repo.full_name.toLowerCase().includes(q));
  }, [repos, query]);

  async function add(repo: Repo) {
    try {
      const created = await addRepo(repo);
      router.push(`/projects/${created.id}`);
    } catch {
      // surfaced through workspace error
    }
  }

  return (
    <EmptyFrame
      eyebrow="repository"
      title="Nothing on the loom"
      body="Add a GitHub repository. An agent clones it into a sandbox, and you talk to it from here."
    >
      <label className="sr-only" htmlFor="empty-repo-filter">
        Filter repositories
      </label>
      <input
        id="empty-repo-filter"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter owner/repo"
        className="w-full border border-line bg-canvas px-3 py-2 font-mono text-[12px] text-fg outline-none placeholder:text-muted focus:border-copper"
      />
      <ul className="mt-3 max-h-64 overflow-auto border border-line">
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-[13px] text-muted">
            {repos.length === 0
              ? "GitHub did not return any repositories."
              : "No repositories match that filter."}
          </li>
        ) : (
          filtered.map((repo) => (
            <li key={repo.full_name} className="border-b border-line last:border-b-0">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void add(repo)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[12px] text-fg">
                    {repo.full_name}
                  </span>
                  <span className="text-[12px] text-muted">
                    {repo.private ? "private" : "public"}
                    {repo.language ? ` · ${repo.language}` : ""} · {repo.default_branch}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-copper">
                  {busy === repo.full_name ? "Adding" : "Add"}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
      {error ? <p className="mt-3 text-[12px] text-danger">{error}</p> : null}
    </EmptyFrame>
  );
}

function StartAgent({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const { startSession, busy, error } = useWorkspace();
  const single = projects.length === 1 ? projects[0] : null;

  async function start(project: Project) {
    try {
      const session = await startSession(project.id);
      router.push(`/sessions/${session.id}`);
    } catch {
      // surfaced through workspace error
    }
  }

  return (
    <EmptyFrame
      wide={Boolean(single)}
      eyebrow={single ? single.full_name : "agents"}
      title="No agents yet"
      body={
        single
          ? `Start one to open a sandbox on ${single.default_branch}.`
          : "Pick a repository. Each agent runs in its own sandbox."
      }
    >
      <ul className="border border-line">
        {projects.map((project) => (
          <li key={project.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void start(project)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface disabled:opacity-40"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-[12px] text-fg">
                  {project.full_name}
                </span>
                <span className="text-[12px] text-muted">{project.default_branch}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-copper">
                {busy === project.id ? "Starting" : "New agent"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-[12px] text-danger">{error}</p> : null}
      {single ? <RepoGlance projectId={single.id} /> : null}
    </EmptyFrame>
  );
}

function EmptyFrame({
  eyebrow,
  title,
  body,
  wide = false,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex min-h-0 flex-1 justify-center overflow-auto px-6 py-10 ${
        wide ? "items-start" : "items-center"
      }`}
    >
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <LoomMark />
        <p className="mt-6 truncate font-mono text-[11px] uppercase tracking-[0.2em] text-copper">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-4xl leading-none tracking-tight text-fg">{title}</h2>
        <p className="mt-4 max-w-sm text-[14px] leading-6 text-muted">{body}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function LoomMark() {
  const warps = [8, 24, 40, 56, 72, 88, 104, 120, 136, 152];
  return (
    <svg viewBox="0 0 160 64" className="h-14 w-36" aria-hidden>
      {warps.map((x) => (
        <line
          key={x}
          x1={x}
          y1="0"
          x2={x}
          y2="64"
          stroke="#2c2c2c"
          strokeWidth="1"
        />
      ))}
      <path
        d="M0 22 H160 M0 42 H160"
        stroke="#3a3228"
        strokeWidth="1"
      />
      <path
        d="M0 32 C 28 18, 52 46, 80 32 S 132 18, 160 32"
        fill="none"
        stroke="#c45c26"
        strokeWidth="1.5"
      />
    </svg>
  );
}
