"use client";

import { useMemo, useState } from "react";

import { useWorkspace } from "@/lib/useWorkspace";
import type { Repo } from "@/lib/types";

export function AddRepoPanel({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (projectId: string) => void;
}) {
  const { repos, projects, addRepo, busy } = useWorkspace();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const taken = new Set(projects.map((project) => project.full_name));
    const q = query.trim().toLowerCase();
    return repos.filter((repo) => {
      if (taken.has(repo.full_name)) return false;
      return !q || repo.full_name.toLowerCase().includes(q);
    });
  }, [projects, repos, query]);

  async function add(repo: Repo) {
    try {
      const project = await addRepo(repo);
      onAdded?.(project.id);
      onClose();
      setQuery("");
    } catch {
      // surfaced on the workspace error line
    }
  }

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[70%] flex-col border-t border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-[13px] text-fg">Add repository</h2>
        <button type="button" onClick={onClose} className="text-[12px] text-muted hover:text-fg">
          Close
        </button>
      </div>
      <div className="px-3 py-2">
        <label className="sr-only" htmlFor="repo-filter">
          Filter repositories
        </label>
        <input
          id="repo-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter owner/repo"
          className="w-full border border-line bg-canvas px-2 py-1.5 text-[12px] text-fg outline-none placeholder:text-muted focus:border-muted"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <li className="px-1 py-3 text-[12px] text-muted">No matching repositories.</li>
        ) : (
          filtered.map((repo) => (
            <li key={repo.full_name}>
              <button
                type="button"
                disabled={busy === repo.full_name}
                onClick={() => void add(repo)}
                className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left hover:bg-canvas disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[12px] text-fg">{repo.full_name}</span>
                  <span className="text-[11px] text-muted">
                    {repo.private ? "private" : "public"} · {repo.default_branch}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-muted">
                  {busy === repo.full_name ? "Adding" : "Add"}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
