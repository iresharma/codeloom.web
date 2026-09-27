export function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className="shrink-0 text-muted">
      {open ? (
        <path
          fill="currentColor"
          d="M1.5 4.5h4.2l1 1.2H14.5v6.3A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12V4.5Z"
          opacity="0.85"
        />
      ) : (
        <path
          fill="currentColor"
          d="M1.5 3.75A1.25 1.25 0 0 1 2.75 2.5h3.1l1.1 1.25H13.25A1.25 1.25 0 0 1 14.5 5v7.25A1.25 1.25 0 0 1 13.25 13.5H2.75A1.25 1.25 0 0 1 1.5 12.25V3.75Z"
          opacity="0.75"
        />
      )}
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className="shrink-0 text-muted">
      <path
        fill="currentColor"
        d="M4 2.5h5.2L13 6.3V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Zm4.8.8V6h2.8Z"
        opacity="0.8"
      />
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="10"
      height="10"
      aria-hidden
      className={`shrink-0 text-muted ${open ? "rotate-90" : ""}`}
    >
      <path fill="currentColor" d="M6 3.5 11 8 6 12.5V3.5Z" />
    </svg>
  );
}
