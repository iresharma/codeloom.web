"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

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

export function DiffView({
  path,
  oldValue,
  newValue,
}: {
  path: string;
  oldValue: string;
  newValue: string;
}) {
  const name = path.split("/").pop() || path || "file";
  return (
    <div className="diff-view overflow-hidden border border-line">
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
        compareMethod={DiffMethod.WORDS}
        extraLinesSurroundingDiff={2}
        styles={{
          variables: { dark: theme },
          contentText: {
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 11,
            lineHeight: "18px",
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
