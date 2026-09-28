"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

import { diffLanguage } from "@/lib/highlight";

const theme = {
  diffViewerBackground: "#191919",
  diffViewerColor: "#e6e6e6",
  addedBackground: "#163226",
  addedColor: "#d5e8d8",
  removedBackground: "#3a1c1c",
  removedColor: "#f0d0d0",
  wordAddedBackground: "#24543a",
  wordRemovedBackground: "#6a2c2c",
  addedGutterBackground: "#163226",
  removedGutterBackground: "#3a1c1c",
  gutterBackground: "#111111",
  gutterBackgroundDark: "#111111",
  highlightBackground: "#191919",
  highlightGutterBackground: "#111111",
  codeFoldGutterBackground: "#111111",
  codeFoldBackground: "#151515",
  emptyLineBackground: "#191919",
  gutterColor: "#8f8f8f",
  addedGutterColor: "#6aa87a",
  removedGutterColor: "#e06c6c",
  codeFoldContentColor: "#8f8f8f",
  diffViewerTitleBackground: "#111111",
  diffViewerTitleColor: "#e6e6e6",
  diffViewerTitleBorderColor: "#2c2c2c",
};

const highlightTheme = {
  default: "#c9d1d9",
  comment: "#8b949e",
  prolog: "#8b949e",
  doctype: "#8b949e",
  cdata: "#8b949e",
  punctuation: "#c9d1d9",
  property: "#79c0ff",
  tag: "#7ee787",
  boolean: "#79c0ff",
  number: "#79c0ff",
  constant: "#79c0ff",
  symbol: "#ffa657",
  selector: "#d2a8ff",
  "attr-name": "#d2a8ff",
  string: "#a5d6ff",
  char: "#a5d6ff",
  builtin: "#ffa657",
  operator: "#ff7b72",
  entity: "#7ee787",
  url: "#a5d6ff",
  "attr-value": "#a5d6ff",
  keyword: "#ff7b72",
  atrule: "#ff7b72",
  "class-name": "#d2a8ff",
  function: "#d2a8ff",
  regex: "#a5d6ff",
  important: "#ffa657",
  variable: "#79c0ff",
};

export function DiffView({
  path,
  filePath,
  oldValue,
  newValue,
}: {
  path: string;
  filePath?: string;
  oldValue: string;
  newValue: string;
}) {
  const name = path.split("/").pop() || path || "file";
  const language = diffLanguage(filePath || path);
  return (
    <div className="diff-view border border-line">
      {path ? (
        <div className="truncate border-b border-line px-2.5 py-1.5 font-mono text-[11px] text-muted">
          {name}
          {path !== name ? <span className="ml-1">{path}</span> : null}
        </div>
      ) : null}
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={false}
        hideLineNumbers={false}
        showDiffOnly
        useDarkTheme
        highlightLanguage={language}
        highlightTheme={highlightTheme}
        compareMethod={DiffMethod.WORDS}
        extraLinesSurroundingDiff={2}
        styles={{
          variables: { dark: theme },
          diffContainer: {
            width: "max-content",
            minWidth: "100%",
            tableLayout: "auto",
            overflowX: "visible",
          },
          contentText: {
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 11,
            lineHeight: "18px",
            whiteSpace: "pre",
            lineBreak: "auto",
          },
          lineContent: {
            overflow: "visible",
            width: "auto",
          },
          gutter: {
            minWidth: 36,
            padding: "0 6px",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 10,
          },
          line: {
            padding: "0 8px",
          },
        }}
      />
    </div>
  );
}
