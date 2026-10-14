"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { pullUrlsInItems, pullUrlsInText } from "@/lib/engine";
import type { ChatItem, PullFile, PullPreview as PullPreviewData } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

import { Markdown } from "./Markdown";
import Loader from "./Loader";

const PULL_REF = /https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

export function pullNumbers(repo: string, urls: string[]): number[] {
  const numbers: number[] = [];
  for (const url of urls) {
    const match = url.match(PULL_REF);
    if (!match || `${match[1]}/${match[2]}` !== repo) continue;
    const number = Number(match[3]);
    if (!numbers.includes(number)) numbers.push(number);
  }
  return numbers;
}

export function PullPreviews({
  projectId,
  repo,
  urls,
  items,
}: {
  projectId: string;
  repo: string;
  urls: string[];
  items: ChatItem[];
}) {
  const numbers = pullNumbers(repo, [
    ...urls,
    ...pullUrlsInItems(items),
    ...urls.flatMap(pullUrlsInText),
  ]).slice(-3).reverse();
  if (numbers.length === 0) return null;
  return (
    <div className="space-y-3">
      {numbers.map((number) => (
        <PullCard key={number} projectId={projectId} number={number} />
      ))}
    </div>
  );
}

function PullCard({ projectId, number }: { projectId: string; number: number }) {
  const { token } = useAuth(false);
  const [pull, setPull] = useState<PullPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .pullPreview(token, projectId, number)
      .then((next) => {
        if (!cancelled) setPull(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "could not load pull request");
      });
    return () => {
      cancelled = true;
    };
  }, [token, projectId, number]);

  if (error) {
    return <p className="border border-line px-3 py-2 text-[12px] text-danger">{error}</p>;
  }
  if (!pull) {
    return (
      <div className="border border-line px-3 py-2">
        <Loader size="sm" label="Loading pull request…" />
      </div>
    );
  }

  const label = pull.draft ? "Draft" : pull.state === "open" ? "Open" : pull.state;
  const tone =
    pull.draft ? "text-warn" : pull.state === "open" ? "text-ok" : pull.state === "closed" ? "text-danger" : "text-muted";

  return (
    <article className="border border-line bg-surface">
      <header className="border-b border-line px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-mono text-[11px] uppercase tracking-[0.16em] ${tone}`}>{label}</p>
            <h2 className="mt-1 text-[15px] leading-5 text-fg">{pull.title}</h2>
          </div>
          <a
            href={pull.html_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-copper hover:underline"
          >
            #{pull.number}
          </a>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          <span className="text-fg">{pull.user || "Someone"}</span>
          {" wants to merge "}
          {pull.commits} commit{pull.commits === 1 ? "" : "s"} into{" "}
          <span className="font-mono text-fg">{pull.base}</span> from{" "}
          <span className="font-mono text-fg">{pull.head}</span>
        </p>
        <p className="mt-1 font-mono text-[12px]">
          <span className="text-ok">+{pull.additions}</span>
          <span className="text-muted"> </span>
          <span className="text-danger">−{pull.deletions}</span>
          <span className="text-muted">
            {" "}
            · {pull.changed_files} file{pull.changed_files === 1 ? "" : "s"}
          </span>
        </p>
      </header>
      {pull.body.trim() ? (
        <div className="max-h-40 overflow-auto border-b border-line px-3 py-2">
          <Markdown text={pull.body} />
        </div>
      ) : null}
      <ul>
        {pull.files.map((file) => (
          <FileRow
            key={file.filename}
            file={file}
            open={openFile === file.filename}
            onToggle={() => setOpenFile((current) => (current === file.filename ? null : file.filename))}
          />
        ))}
      </ul>
    </article>
  );
}

function FileRow({
  file,
  open,
  onToggle,
}: {
  file: PullFile;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-canvas"
      >
        <span className="min-w-0 truncate font-mono text-[12px] text-fg">{file.filename}</span>
        <span className="shrink-0 font-mono text-[11px]">
          <span className="text-muted">{file.status}</span>{" "}
          <span className="text-ok">+{file.additions}</span>{" "}
          <span className="text-danger">−{file.deletions}</span>
        </span>
      </button>
      {open && file.patch ? <Patch patch={file.patch} /> : null}
    </li>
  );
}

function Patch({ patch }: { patch: string }) {
  return (
    <pre className="max-h-80 overflow-auto border-t border-line bg-canvas py-2 font-mono text-[11px] leading-4">
      {patch.split("\n").map((line, index) => {
        const added = line.startsWith("+") && !line.startsWith("+++");
        const removed = line.startsWith("-") && !line.startsWith("---");
        const hunk = line.startsWith("@@");
        const tone = added
          ? "bg-[#163226] text-[#d5e8d8]"
          : removed
            ? "bg-[#3a1c1c] text-[#f0d0d0]"
            : hunk
              ? "text-muted"
              : "text-fg";
        return (
          <div key={index} className={`px-3 ${tone}`}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
