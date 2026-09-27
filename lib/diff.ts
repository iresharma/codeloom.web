import { parseArgs, stringArg } from "./chat";
import type { ChatTool } from "./types";

export type ToolDiff = {
  path: string;
  oldValue: string;
  newValue: string;
};

const WRITE = new Set(["write", "writefile", "createfile", "create"]);

function looksLikeDiff(text: string): boolean {
  return /^(--- |\+\+\+ |@@ )|\n(--- |\+\+\+ |@@ )/m.test(text);
}

function unescapeNewlines(value: string): string {
  return value.includes("\n") ? value : value.replaceAll("\\n", "\n");
}

function unifiedToSides(patch: string): ToolDiff | null {
  const lines = patch.replace(/\r\n/g, "\n").split("\n");
  const oldLines: string[] = [];
  const newLines: string[] = [];
  let path = "";
  let hunks = 0;

  for (const line of lines) {
    if (line.startsWith("--- ")) {
      path = line.slice(4).replace(/^[ab]\//, "").trim();
      continue;
    }
    if (line.startsWith("+++ ")) {
      const next = line.slice(4).replace(/^[ab]\//, "").trim();
      if (next && next !== "/dev/null") path = next;
      continue;
    }
    if (line.startsWith("@@")) {
      hunks += 1;
      continue;
    }
    if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted file")) {
      continue;
    }
    if (line.startsWith("+")) {
      newLines.push(line.slice(1));
      continue;
    }
    if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
      continue;
    }
    if (line.startsWith("\\")) continue;
    const text = line.startsWith(" ") ? line.slice(1) : line;
    oldLines.push(text);
    newLines.push(text);
  }

  if (!hunks && oldLines.length === 0 && newLines.length === 0) return null;
  return { path, oldValue: oldLines.join("\n"), newValue: newLines.join("\n") };
}

export function toolDiff(item: ChatTool): ToolDiff | null {
  const args = parseArgs(item.arguments_json);
  const path = stringArg(args, ["path", "file", "filepath", "target"]) ?? "";
  const oldValue = stringArg(args, ["old_string", "oldString", "old_text", "old", "before", "original"]);
  const newValue = stringArg(args, [
    "new_string",
    "newString",
    "new_text",
    "new",
    "after",
    "replacement",
    "contents",
    "content",
  ]);

  if (oldValue != null && newValue != null) {
    return { path, oldValue: unescapeNewlines(oldValue), newValue: unescapeNewlines(newValue) };
  }

  const name = item.name.toLowerCase().replace(/[_\s]+/g, "");
  if (newValue != null && WRITE.has(name) && oldValue == null) {
    return { path, oldValue: "", newValue: unescapeNewlines(newValue) };
  }

  const patch = stringArg(args, ["patch", "diff", "hunk"]) ?? (item.preview && looksLikeDiff(item.preview) ? item.preview : null);
  if (patch) {
    const parsed = unifiedToSides(unescapeNewlines(patch));
    if (parsed) return { path: parsed.path || path, oldValue: parsed.oldValue, newValue: parsed.newValue };
  }
  return null;
}
