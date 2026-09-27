import type { FileTreeNode } from "./types";

export function fileName(path: string): string {
  return path.split("/").pop() || path;
}

export function fileDir(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}

export function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes
    .slice()
    .sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .map((node) =>
      node.children ? { ...node, children: sortTree(node.children) } : node,
    );
}

export function flattenFiles(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const hits: FileTreeNode[] = [];
  function walk(list: FileTreeNode[]) {
    for (const node of list) {
      if (!node.is_dir && node.path.toLowerCase().includes(q)) hits.push(node);
      if (node.children) walk(node.children);
    }
  }
  walk(nodes);
  return hits.sort((a, b) => a.path.localeCompare(b.path));
}
