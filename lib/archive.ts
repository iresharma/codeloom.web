import type { ChatItem, SessionArchive, Stats } from "./types";

const STORAGE_PREFIX = "codeloom.archive.";
const TEXT_LIMIT = 8_000;

function clip(value: string | undefined): string | undefined {
  if (value == null || value.length <= TEXT_LIMIT) return value;
  return `${value.slice(0, TEXT_LIMIT)}…`;
}

export function packArchive(stats: Stats | null, items: ChatItem[]): SessionArchive {
  return {
    stats,
    items: items.map((item) => {
      if (item.kind !== "tool") {
        return { ...item, text: clip(item.text) ?? item.text, streaming: false };
      }
      return {
        ...item,
        arguments_json: clip(item.arguments_json) ?? "",
        preview: clip(item.preview),
      };
    }),
  };
}

export function archiveHasConversation(archive: SessionArchive | null): boolean {
  return Boolean(archive?.items.some((item) => item.kind === "message" || item.kind === "tool"));
}

export function readLocalArchive(sessionId: string): SessionArchive | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionArchive;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return { stats: parsed.stats ?? null, items: parsed.items };
  } catch {
    return null;
  }
}

export function clearLocalArchive(sessionId: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + sessionId);
  } catch {
    /* private mode */
  }
}

export function writeLocalArchive(sessionId: string, archive: SessionArchive): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(archive));
  } catch {
    /* quota or private mode */
  }
}
