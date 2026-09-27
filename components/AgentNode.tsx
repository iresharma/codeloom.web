"use client";

import { isAgentActive } from "@/lib/agents";

import { StatusDot } from "./StatusDot";

export function AgentNode({
  title,
  status,
  detail,
  selected,
  left,
  top,
  onSelect,
}: {
  title: string;
  status: string;
  detail: string;
  selected: boolean;
  left: number;
  top: number;
  onSelect: () => void;
}) {
  const live = isAgentActive(status);
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ left, top }}
      className={`absolute w-[168px] border px-2.5 py-2 text-left ${
        selected ? "border-fg bg-canvas" : "border-line bg-surface hover:border-muted"
      } ${live ? "" : "opacity-60"}`}
    >
      <div className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className="truncate text-[12px] text-fg">{title}</span>
      </div>
      <div className="mt-0.5 truncate font-mono text-[10px] text-muted">{status}</div>
      {detail ? <div className="mt-0.5 truncate text-[11px] text-muted">{detail}</div> : null}
    </button>
  );
}
