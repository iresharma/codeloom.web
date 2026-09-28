import type { ChatItem, ChatTool, SessionArchive, Stats } from "./types";

const STORAGE_PREFIX = "codeloom.archive.";
const TEXT_LIMIT = 8_000;
const ARCHIVE_LIMIT = 1_200_000;

function clip(value: string | undefined): string | undefined {
  if (value == null || value.length <= TEXT_LIMIT) return value;
  return `${value.slice(0, TEXT_LIMIT)}…`;
}

function withoutImage(item: ChatTool): ChatTool {
  const { image: _image, image_mime: _mime, ...rest } = item;
  return rest;
}

export function packArchive(
  stats: Stats | null,
  items: ChatItem[],
  options?: { images?: boolean },
): SessionArchive {
  const keepImages = options?.images !== false;
  const packed: ChatItem[] = items.map((item) => {
    if (item.kind !== "tool") {
      return { ...item, text: clip(item.text) ?? item.text, streaming: false };
    }
    const tool = {
      ...item,
      arguments_json: clip(item.arguments_json) ?? "",
      preview: clip(item.preview),
    };
    return keepImages ? tool : withoutImage(tool);
  });
  const archive: SessionArchive = { stats, items: packed };
  const shots = packed.flatMap((item, index) =>
    item.kind === "tool" && item.image ? [index] : [],
  );
  if (!shots.length) return archive;
  for (const index of shots) {
    if (JSON.stringify(archive).length <= ARCHIVE_LIMIT) return archive;
    const item = archive.items[index];
    if (item?.kind !== "tool") continue;
    archive.items[index] = withoutImage(item);
  }
  return archive;
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
  const slim: SessionArchive = {
    stats: archive.stats,
    items: archive.items.map((item) => (item.kind === "tool" ? withoutImage(item) : item)),
  };
  try {
    window.localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(archive));
  } catch {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(slim));
    } catch {
      /* quota or private mode */
    }
  }
}
