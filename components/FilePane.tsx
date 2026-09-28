"use client";

import { useMemo } from "react";

import { highlightCode, languageForPath } from "@/lib/highlight";
import "highlight.js/styles/github-dark.css";

import { DiffView } from "./DiffView";

export function FilePane({
  path,
  content,
  original,
  loading,
  error,
  onClose,
}: {
  path: string;
  content: string;
  original?: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}) {
  const name = path.split("/").pop() || path;
  const language = languageForPath(path);
  const html = useMemo(() => highlightCode(path, content), [path, content]);
  const lineCount = content.length === 0 ? 1 : content.split("\n").length;
  const showDiff = typeof original === "string";

  return (
    <section className="flex min-h-0 w-[min(560px,46%)] shrink-0 flex-col overflow-hidden border-l border-line bg-canvas">
      <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] text-fg">{name}</div>
          <div className="truncate font-mono text-[11px] text-muted">
            {path}
            {showDiff ? " · diff" : language ? ` · ${language}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-2 py-1 text-[12px] text-muted hover:text-fg"
        >
          Close
        </button>
      </header>
      {loading && !content && original == null ? (
        <p className="px-4 py-6 text-[13px] text-muted">Loading…</p>
      ) : error && !content && original == null ? (
        <p className="px-4 py-6 text-[13px] text-danger">{error}</p>
      ) : showDiff ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <DiffView path="" filePath={path} oldValue={original ?? ""} newValue={content} />
        </div>
      ) : (
        <div className="file-code min-h-0 flex-1 overflow-auto">
          <div className="flex min-w-max">
            <div
              aria-hidden
              className="sticky left-0 select-none border-r border-line bg-canvas px-3 py-3 text-right font-mono text-[13px] leading-6 text-muted/70"
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <pre className="m-0 bg-transparent p-3 font-mono text-[13px] leading-6">
              <code
                className={`hljs language-${language ?? "plaintext"}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
