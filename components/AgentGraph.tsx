"use client";

import { useMemo } from "react";

import {
  isAgentActive,
  layoutAgents,
  nodeIdForAgent,
  ORCHESTRATOR_ID,
  ORCHESTRATOR_NODE,
} from "@/lib/agents";
import type { AgentRow } from "@/lib/types";

import { AgentNode } from "./AgentNode";

const NODE_W = 168;
const NODE_H = 64;
const COL_W = 196;
const ROW_H = 88;
const PAD = 16;

function nodePoint(column: number, row: number, side: "left" | "right") {
  return {
    x: PAD + column * COL_W + (side === "right" ? NODE_W : 0),
    y: PAD + row * ROW_H + NODE_H / 2,
  };
}

export function AgentGraph({
  agents,
  selectedId,
  includeFinished,
  onSelect,
}: {
  agents: AgentRow[];
  selectedId: string;
  includeFinished: boolean;
  onSelect: (id: string) => void;
}) {
  const laidOut = useMemo(() => layoutAgents(agents, includeFinished), [agents, includeFinished]);
  const finishedCount = agents.filter((agent) => agent.id && !isAgentActive(agent.status)).length;
  const width = Math.max(
    NODE_W + PAD * 2,
    ...laidOut.map((node) => PAD + node.column * COL_W + NODE_W + PAD),
  );
  const height = Math.max(
    NODE_H + PAD * 2,
    ...laidOut.map((node) => PAD + node.row * ROW_H + NODE_H + PAD),
  );
  const byId = new Map(laidOut.map((node) => [node.id, node]));

  const edges = laidOut
    .filter((node) => node.agentId)
    .map((node) => {
      const agent = agents.find((row) => row.id === node.agentId);
      const parentId = nodeIdForAgent(agent?.parent_id ?? "");
      const parent = byId.get(parentId) ?? byId.get(ORCHESTRATOR_NODE);
      if (!parent) return null;
      const from = nodePoint(parent.column, parent.row, "right");
      const to = nodePoint(node.column, node.row, "left");
      const mid = (from.x + to.x) / 2;
      return {
        id: `${parent.id}-${node.id}`,
        d: `M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`,
      };
    })
    .filter((edge): edge is { id: string; d: string } => Boolean(edge));

  return (
    <div className="relative h-full min-h-0 w-full overflow-auto">
      <div className="relative" style={{ width, height }}>
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
          {edges.map((edge) => (
            <path key={edge.id} d={edge.d} fill="none" stroke="#2c2c2c" strokeWidth="1" />
          ))}
        </svg>
        {laidOut.map((node) => (
          <AgentNode
            key={node.id}
            title={node.title}
            status={node.status}
            detail={node.detail}
            selected={selectedId === node.agentId}
            left={PAD + node.column * COL_W}
            top={PAD + node.row * ROW_H}
            onSelect={() => onSelect(node.agentId || ORCHESTRATOR_ID)}
          />
        ))}
      </div>
      {includeFinished && finishedCount === 0 ? (
        <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-muted">
          No finished agents yet
        </p>
      ) : null}
    </div>
  );
}
