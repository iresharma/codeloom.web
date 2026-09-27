"use client";

import { useMemo, useState, type ReactNode } from "react";

import { flattenFiles, sortTree } from "@/lib/files";
import type { FileTreeNode } from "@/lib/types";

import { ChevronIcon, FileIcon, FolderIcon } from "./FileIcons";

function Row({
  children,
  depth,
  active,
  expanded,
  onClick,
}: {
  children: ReactNode;
  depth: number;
  active?: boolean;
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`flex w-full items-center gap-1.5 truncate py-0.5 pr-2 text-left ${
        active ? "bg-canvas text-fg" : "text-muted hover:bg-canvas/70 hover:text-fg"
      }`}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      {children}
    </button>
  );
}

function Node({
  node,
  depth,
  selected,
  onOpen,
}: {
  node: FileTreeNode;
  depth: number;
  selected: string | null;
  onOpen: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const children = useMemo(() => sortTree(node.children ?? []), [node.children]);

  if (node.is_dir) {
    return (
      <div>
        <Row depth={depth} expanded={open} onClick={() => setOpen((current) => !current)}>
          <ChevronIcon open={open} />
          <FolderIcon open={open} />
          <span className="truncate">{node.name}</span>
        </Row>
        {open
          ? children.map((child) => (
              <Node
                key={child.path}
                node={child}
                depth={depth + 1}
                selected={selected}
                onOpen={onOpen}
              />
            ))
          : null}
      </div>
    );
  }

  return (
    <Row depth={depth} active={selected === node.path} onClick={() => onOpen(node.path)}>
      <span className="w-2.5 shrink-0" />
      <FileIcon />
      <span className={`truncate ${selected === node.path ? "text-fg" : ""}`}>{node.name}</span>
    </Row>
  );
}

export function FileTree({
  tree,
  selected,
  onOpen,
}: {
  tree: FileTreeNode[];
  selected?: string | null;
  onOpen: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => sortTree(tree), [tree]);
  const filtered = useMemo(() => flattenFiles(sorted, query), [sorted, query]);
  const searching = query.trim().length > 0;

  if (tree.length === 0) {
    return <p className="px-2 py-2 text-[12px] text-muted">No files yet.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-2 pb-2">
        <label className="sr-only" htmlFor="file-filter">
          Filter files
        </label>
        <input
          id="file-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter files"
          className="w-full border border-line bg-canvas px-2 py-1 text-[12px] text-fg outline-none placeholder:text-muted focus:border-muted"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5">
        {searching ? (
          filtered.length === 0 ? (
            <p className="px-2 py-2 text-muted">No matching files.</p>
          ) : (
            filtered.map((node) => (
              <Row
                key={node.path}
                depth={0}
                active={selected === node.path}
                onClick={() => onOpen(node.path)}
              >
                <FileIcon />
                <span className="min-w-0 truncate">
                  <span className={selected === node.path ? "text-fg" : ""}>{node.name}</span>
                  <span className="ml-1 text-muted/70">{node.path}</span>
                </span>
              </Row>
            ))
          )
        ) : (
          sorted.map((node) => (
            <Node
              key={node.path}
              node={node}
              depth={0}
              selected={selected ?? null}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}
