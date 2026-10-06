"use client";

import { useEffect, useState } from "react";

import { api, isGitHubAuthExpired } from "@/lib/api";
import type { ProjectOverview, WorkItem } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useWorkspace } from "@/lib/useWorkspace";
import { formatWhen } from "@/lib/workspace";

export function RepoGlance({ projectId }: { projectId: string }) {
  const { token } = useAuth(false);
  const { githubAuthExpired } = useWorkspace();
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || githubAuthExpired) return;
    let cancelled = false;
    api
      .projectOverview(token, projectId)
      .then((next) => {
        if (!cancelled) setOverview(next);
      })
      .catch((err: unknown) => {
        if (cancelled || isGitHubAuthExpired(err)) return;
        setError(err instanceof Error ? err.message : "could not load repository");
      });
    return () => {
      cancelled = true;
    };
  }, [token, projectId, githubAuthExpired]);

  if (githubAuthExpired) return null;
  if (error) return <p className="mt-8 text-[12px] text-danger">{error}</p>;
  if (!overview) return <p className="mt-8 text-[12px] text-muted">Loading repository…</p>;

  const facts = [
    overview.language ?? "No language",
    overview.private ? "private" : "public",
    `${overview.stars} stars`,
    `${overview.forks} forks`,
    `${overview.open_issues} open`,
  ];

  return (
    <section className="mt-8 border border-line">
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-line px-3 py-2 text-[12px] text-muted">
        {facts.map((fact) => (
          <span key={fact}>{fact}</span>
        ))}
        {overview.html_url ? (
          <a
            href={overview.html_url}
            target="_blank"
            rel="noreferrer"
            className="text-copper hover:underline"
          >
            GitHub
          </a>
        ) : null}
      </div>
      {overview.description ? (
        <p className="border-b border-line px-3 py-2 text-[13px] leading-5 text-fg">
          {overview.description}
        </p>
      ) : null}
      <div className="grid md:grid-cols-2">
        <WorkList title="Issues" rows={overview.issues} empty="No open issues" />
        <WorkList title="Pull requests" rows={overview.pulls} empty="No open pull requests" />
      </div>
      {overview.contributors.length > 0 ? (
        <div className="border-t border-line px-3 py-3">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Contributors
          </h3>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {overview.contributors.map((person) => (
              <li key={person.login} className="flex items-center gap-2">
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt=""
                    className="h-5 w-5"
                  />
                ) : null}
                <span className="font-mono text-[12px] text-fg">{person.login}</span>
                <span className="text-[11px] text-muted">{person.contributions}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function WorkList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: WorkItem[];
  empty: string;
}) {
  return (
    <div className="border-b border-line px-3 py-3 md:border-b-0 md:border-r md:last:border-r-0">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={row.number}>
              <a
                href={row.html_url}
                target="_blank"
                rel="noreferrer"
                className="block hover:text-copper"
              >
                <span className="font-mono text-[12px] text-copper">#{row.number}</span>{" "}
                <span className="text-[13px] text-fg">{row.title}</span>
              </a>
              <p className="truncate text-[11px] text-muted">
                {row.user}
                {row.updated_at ? ` · ${formatWhen(row.updated_at)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
