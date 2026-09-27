"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useSessionStream } from "@/lib/useSessionStream";
import { useWorkspace } from "@/lib/useWorkspace";
import type { Session } from "@/lib/types";
import { formatTokens } from "@/lib/agents";
import { dismissPrompt, type EngineState } from "@/lib/engine";

import { Composer } from "./Composer";
import { FilePane } from "./FilePane";
import { InspectPanel, type InspectTab } from "./InspectPanel";
import { PromptCard } from "./PromptCard";
import { StatusDot } from "./StatusDot";
import { Transcript } from "./Transcript";

function isRunning(state: EngineState): boolean {
  const items = state.itemsByAgent[state.selectedAgentId] ?? [];
  if (items.some((item) => item.kind === "message" && item.streaming)) return true;
  if (items.some((item) => item.kind === "tool" && item.ok === undefined)) return true;
  if (state.selectedAgentId) {
    const agent = state.agents.find((row) => row.id === state.selectedAgentId);
    return agent?.status === "running";
  }
  return state.agents.some((row) => row.status === "running");
}

export function SessionWorkspace() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const { patchSession } = useWorkspace();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<InspectTab>("agents");
  const [requestedPath, setRequestedPath] = useState<string | null>(null);
  const live = session?.status === "ready";
  const { state, connected, send, selectAgent, setState } = useSessionStream(
    params.id,
    token,
    Boolean(live),
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function poll() {
      try {
        const next = await api.session(token as string, params.id);
        if (cancelled) return;
        setSession(next);
        patchSession(next);
        if (next.status === "provisioning") {
          window.setTimeout(poll, 1000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "session not found");
        }
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [params.id, token, patchSession]);

  const items = state.itemsByAgent[state.selectedAgentId] ?? [];
  const running = isRunning(state);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distance < 96) node.scrollTop = node.scrollHeight;
  }, [items]);

  function requestFile(path: string) {
    setRequestedPath(path);
    send({ type: "OpenFile", path });
  }

  function closeFile() {
    setRequestedPath(null);
    setState((current) => ({ ...current, openFile: null }));
  }

  const viewedFile =
    requestedPath && state.openFile?.path === requestedPath
      ? state.openFile
      : requestedPath
        ? { path: requestedPath, content: "" }
        : null;
  const fileLoading = Boolean(requestedPath && state.openFile?.path !== requestedPath);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
            {session ? <StatusDot status={session.status} /> : null}
            <span className="truncate text-fg">{session?.repo ?? "session"}</span>
            <span>{session?.branch}</span>
            <span>{session?.status ?? "…"}</span>
            {live ? <span>{connected ? "live" : "connecting"}</span> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[12px] text-muted">
            {state.git?.branch ? (
              <span>
                {state.git.branch}
                {state.git.dirty ? "*" : ""}
              </span>
            ) : null}
            {state.stats?.total_tokens ? (
              <span title={`${state.stats.total_tokens} tokens`}>
                {formatTokens(state.stats.total_tokens)} tok
                {state.stats.cached_tokens
                  ? ` · ${formatTokens(state.stats.cached_tokens)} cached`
                  : ""}
                {state.stats.requests ? ` · ${state.stats.requests} calls` : ""}
              </span>
            ) : null}
            {session?.status === "ready" && token ? (
              <button
                type="button"
                onClick={() =>
                  api.stopSession(token, params.id).then((next) => {
                    setSession(next);
                    patchSession(next);
                  })
                }
                className="text-danger hover:underline"
              >
                Stop session
              </button>
            ) : null}
          </div>
        </header>

        {error ? <p className="px-4 py-3 text-[13px] text-danger">{error}</p> : null}

        {session?.status === "provisioning" ? (
          <p className="px-4 py-10 text-[13px] text-muted">Provisioning sandbox…</p>
        ) : null}

        {session?.status === "error" || session?.status === "stopped" ? (
          <div className="px-4 py-8">
            <p className="text-[13px] text-danger">{session.status}</p>
            {session.error ? (
              <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap border border-line bg-surface p-4 font-mono text-[12px] text-fg">
                {session.error}
              </pre>
            ) : (
              <p className="mt-3 text-[13px] text-muted">This session is no longer running.</p>
            )}
          </div>
        ) : null}

        {live ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div ref={transcriptRef} className="min-h-0 flex-1 overflow-auto px-4 py-4">
                <Transcript
                  items={items}
                  agents={state.agents}
                  selectedAgentId={state.selectedAgentId}
                  pendingPrompt={state.pendingPrompt}
                />
              </div>
              <div className="shrink-0 space-y-3 overflow-hidden border-t border-line p-3">
                {state.error ? <p className="text-[12px] text-danger">{state.error}</p> : null}
                {state.pendingPrompt ? (
                  <PromptCard
                    prompt={state.pendingPrompt}
                    onAnswer={(text) => {
                      const prompt = state.pendingPrompt;
                      if (!prompt) return;
                      setState((current) => dismissPrompt(current, prompt));
                      send({
                        type: "AnswerPrompt",
                        prompt_id: prompt.prompt_id,
                        text,
                      });
                    }}
                  />
                ) : null}
                <Composer
                  disabled={!connected}
                  running={running}
                  onSend={(text) => send({ type: "SubmitUserMessage", text })}
                  onAbort={() =>
                    send({
                      type: "AbortAgent",
                      agent_id: state.selectedAgentId || null,
                    })
                  }
                />
              </div>
            </div>
            {viewedFile ? (
              <FilePane
                path={viewedFile.path}
                content={viewedFile.content}
                loading={fileLoading}
                onClose={closeFile}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {live ? (
        <InspectPanel
          collapsed={!panelOpen}
          onToggle={() => setPanelOpen((open) => !open)}
          tab={tab}
          onTab={setTab}
          agents={state.agents}
          selectedAgentId={state.selectedAgentId}
          onSelectAgent={selectAgent}
          itemsByAgent={state.itemsByAgent}
          sessionStats={state.stats}
          git={state.git}
          fileTree={state.fileTree}
          openFilePath={viewedFile?.path ?? null}
          onOpenFile={requestFile}
        />
      ) : null}
    </div>
  );
}
