"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { packArchive, readLocalArchive, writeLocalArchive } from "@/lib/archive";
import { api } from "@/lib/api";
import { autoAnswer, isInterviewPrompt, readAutoMode, writeAutoMode } from "@/lib/prompt";
import { useAuth } from "@/lib/useAuth";
import { useSessionStream } from "@/lib/useSessionStream";
import { useWorkspace } from "@/lib/useWorkspace";
import { mergeGit, type ChatItem, type Session, type SessionArchive } from "@/lib/types";
import { formatCost, formatTokens, hydrateAgents } from "@/lib/agents";
import { dismissPrompt, itemsForAgent, type EngineState } from "@/lib/engine";
import { clipTitle } from "@/lib/workspace";

import { Composer } from "./Composer";
import { SessionFinale } from "./SessionFinale";
import { FilePane } from "./FilePane";
import { InspectPanel, type InspectTab } from "./InspectPanel";
import { PromptCard } from "./PromptCard";
import { StatusDot } from "./StatusDot";
import { Transcript } from "./Transcript";

function samePath(left: string, right: string): boolean {
  const norm = (value: string) => value.replace(/^\.\//, "").replace(/\/+$/, "");
  return norm(left) === norm(right);
}

function isOpenFileError(message: string | null, path: string | null): boolean {
  if (!message || !path) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("file not found") ||
    lower.includes("outside the workspace") ||
    lower.includes("is a directory") ||
    message.includes(path)
  );
}

function isRunning(state: EngineState): boolean {
  const items = itemsForAgent(state.itemsByAgent, state.selectedAgentId);
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
  const [auto, setAuto] = useState(false);
  const [prefill, setPrefill] = useState<{ id: number; text: string } | null>(null);
  const [archive, setArchive] = useState<SessionArchive | null>(null);
  const [archiveSessionId, setArchiveSessionId] = useState(params.id);
  const [reading, setReading] = useState(false);
  if (archiveSessionId !== params.id) {
    setArchiveSessionId(params.id);
    setArchive(null);
    setReading(false);
  }
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

  const agents = hydrateAgents(state.agents, state.stats, state.itemsByAgent);
  const git = mergeGit(state.git, state.editedPaths ?? []);
  const items = itemsForAgent(state.itemsByAgent, state.selectedAgentId);
  const conversation = (state.itemsByAgent[""] ?? []).length ? (state.itemsByAgent[""] ?? []) : items;
  const running = isRunning({ ...state, agents });
  const transcriptRef = useRef<HTMLDivElement>(null);
  const answeringRef = useRef<string | null>(null);
  const titleSent = useRef<string | null>(null);
  const savedArchive = useRef("");
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    titleSent.current = null;
    savedArchive.current = "";
  }, [params.id]);

  function rememberTitle(text: string) {
    const current = sessionRef.current;
    if (!token || !current || current.title?.trim()) return;
    const title = clipTitle(text);
    if (!title || titleSent.current === title) return;
    titleSent.current = title;
    const next = { ...current, title };
    setSession(next);
    patchSession(next);
    void api.setSessionTitle(token, current.id, title).then((saved) => {
      setSession(saved);
      patchSession(saved);
    }).catch(() => {
      titleSent.current = null;
    });
  }

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distance < 96) node.scrollTop = node.scrollHeight;
  }, [items]);

  useEffect(() => {
    if (!connected || !live) return;
    send({ type: "RequestGit" });
  }, [connected, live, send]);

  useEffect(() => {
    if (!connected || !live || tab !== "changes") return;
    send({ type: "RequestGit" });
  }, [connected, live, tab, send]);

  useEffect(() => {
    setAuto(readAutoMode());
  }, []);

  useEffect(() => {
    if (!connected || session?.id !== params.id) return;
    const first = items.find(
      (item): item is Extract<ChatItem, { kind: "message" }> =>
        item.kind === "message" && item.role.toLowerCase() === "user" && Boolean(item.text.trim()),
    );
    if (first) rememberTitle(first.text);
  }, [items, connected, session?.id, session?.title, params.id, token, patchSession]);

  useEffect(() => {
    if (session?.id !== params.id) return;
    if (session.status !== "stopped" && session.status !== "error") return;
    if (!conversation.length && !state.stats) return;
    const next = packArchive(state.stats, conversation);
    setArchive(next);
    writeLocalArchive(params.id, next);
    if (token) {
      savedArchive.current = JSON.stringify(next);
      void api.saveArchive(token, params.id, next).catch(() => {
        savedArchive.current = "";
      });
    }
  }, [session?.id, session?.status, conversation, state.stats, params.id, token]);

  useEffect(() => {
    if (!connected || session?.id !== params.id) return;
    if (!conversation.length && !state.stats) return;
    const next = packArchive(state.stats, conversation);
    setArchive(next);
    writeLocalArchive(params.id, next);
  }, [connected, conversation, state.stats, session?.id, params.id]);

  useEffect(() => {
    if (!connected || !token || !archive || session?.id !== params.id) return;
    const body = JSON.stringify(archive);
    if (body === savedArchive.current) return;
    const timer = window.setTimeout(() => {
      savedArchive.current = body;
      void api.saveArchive(token, params.id, archive).catch(() => {
        savedArchive.current = "";
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [archive, connected, token, params.id, session?.id]);

  useEffect(() => {
    if (!token || !session || session.id !== params.id) return;
    if (session.status === "ready" || session.status === "provisioning") return;
    if (archive) return;
    let cancelled = false;
    const local = readLocalArchive(params.id);
    if (local) setArchive(local);
    void api.archive(token, params.id).then((remote) => {
      if (cancelled) return;
      if (remote.items.length || remote.stats) setArchive(remote);
      else if (!local) setArchive({ stats: null, items: [] });
    }).catch(() => {
      if (!cancelled && !local) setArchive({ stats: null, items: [] });
    });
    return () => {
      cancelled = true;
    };
  }, [archive, params.id, session, token]);

  useEffect(() => {
    const prompt = state.pendingPrompt;
    if (!auto || !connected || !prompt) {
      if (!prompt) answeringRef.current = null;
      return;
    }
    // Interview prompts stay visible so the user can clarify even with Auto on.
    if (isInterviewPrompt(prompt)) return;
    const key = prompt.prompt_id || prompt.question;
    if (answeringRef.current === key) return;
    answeringRef.current = key;
    setState((current) => dismissPrompt(current, prompt));
    send({
      type: "AnswerPrompt",
      prompt_id: prompt.prompt_id,
      text: autoAnswer(prompt),
    });
  }, [auto, connected, send, setState, state.pendingPrompt]);

  function requestFile(path: string) {
    setRequestedPath(path);
    setState((current) => ({ ...current, openFile: null, error: null }));
    send({ type: "OpenFile", path });
  }

  function closeFile() {
    setRequestedPath(null);
    setState((current) => ({ ...current, openFile: null }));
  }

  const viewedFile =
    requestedPath && state.openFile && samePath(state.openFile.path, requestedPath)
      ? state.openFile
      : requestedPath
        ? { path: requestedPath, content: "", original: null }
        : null;
  const openFailed = Boolean(
    requestedPath &&
      !(state.openFile && samePath(state.openFile.path, requestedPath)) &&
      isOpenFileError(state.error, requestedPath),
  );
  const fileLoading = Boolean(
    requestedPath &&
      !(state.openFile && samePath(state.openFile.path, requestedPath)) &&
      !openFailed,
  );
  const usage = state.stats ?? archive?.stats ?? null;
  const models = (usage?.models ?? []).filter((name) => name.trim());

  const gitLabel = state.git?.branch
    ? `${state.git.branch}${state.git.dirty ? "*" : ""}`
    : session?.branch;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-w-0 items-center gap-2 border-b border-line px-3 py-2 text-[12px]">
          {session ? <StatusDot status={session.status} /> : null}
          <span className="min-w-0 truncate text-fg">
            {session?.title?.trim() || session?.repo || "session"}
          </span>
          {session?.title?.trim() ? (
            <span className="min-w-0 max-w-[40%] shrink truncate text-muted">{session.repo}</span>
          ) : null}
        </header>

        {error ? <p className="px-4 py-3 text-[13px] text-danger">{error}</p> : null}

        {session?.status === "provisioning" ? (
          <p className="px-4 py-10 text-[13px] text-muted">Provisioning sandbox…</p>
        ) : null}

        {session?.status === "error" || session?.status === "stopped" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SessionFinale
              session={session}
              archive={archive}
              reading={reading}
              onToggle={() => setReading((open) => !open)}
            />
            {reading && archive ? (
              <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                <Transcript
                  items={archive.items}
                  agents={[]}
                  selectedAgentId=""
                  pendingPrompt={null}
                  sessionStats={archive.stats}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {live ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div ref={transcriptRef} className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4">
                <Transcript
                  items={items}
                  agents={agents}
                  selectedAgentId={state.selectedAgentId}
                  pendingPrompt={auto ? null : state.pendingPrompt}
                  sessionStats={state.stats}
                  repo={session.repo}
                  branch={session.branch}
                  onSuggest={(text) => setPrefill({ id: Date.now(), text })}
                />
              </div>
              <div className="shrink-0 space-y-3 overflow-hidden border-t border-line p-3">
                {state.error ? <p className="text-[12px] text-danger">{state.error}</p> : null}
                {!auto && state.pendingPrompt ? (
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
                  prefill={prefill}
                  onSend={(text, model) => {
                    rememberTitle(text);
                    if (state.selectedAgentId) selectAgent("");
                    const payload: { type: string; text: string; model?: string } = {
                      type: "SubmitUserMessage",
                      text,
                    };
                    if (model) payload.model = model;
                    send(payload);
                  }}
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
                original={viewedFile.original}
                loading={fileLoading}
                error={openFailed ? state.error : null}
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
          agents={agents}
          selectedAgentId={state.selectedAgentId}
          onSelectAgent={selectAgent}
          itemsByAgent={state.itemsByAgent}
          sessionStats={state.stats}
          git={git}
          fileTree={state.fileTree}
          openFilePath={viewedFile?.path ?? null}
          onOpenFile={requestFile}
        />
      ) : null}
      </div>
      <footer className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-line bg-surface px-3 text-[12px] text-muted">
        <div className="flex min-w-0 items-center gap-3">
          <span className={live && connected ? "text-ok" : undefined}>
            {live ? (connected ? "live" : "connecting") : (session?.status ?? "…")}
          </span>
          {gitLabel ? <span className="truncate font-mono">{gitLabel}</span> : null}
          {models.length ? (
            <span className="min-w-0 truncate font-mono" title={models.join("\n")}>
              {models.join(" · ")}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {usage && (usage.total_tokens || usage.requests || usage.cost) ? (
            <>
              <span title={`${usage.total_tokens ?? 0} tokens`}>
                {formatTokens(usage.total_tokens)} tok
              </span>
              {usage.cached_tokens ? (
                <span>{formatTokens(usage.cached_tokens)} cached</span>
              ) : null}
              {usage.requests ? <span>{usage.requests} calls</span> : null}
              {usage.cost != null ? <span>{formatCost(usage.cost)}</span> : null}
            </>
          ) : null}
          {live ? (
            <button
              type="button"
              aria-pressed={auto}
              title="Auto-answer permission, settle, and turn-cap prompts"
              onClick={() => {
                setAuto((current) => {
                  const next = !current;
                  writeAutoMode(next);
                  return next;
                });
              }}
              className={auto ? "text-ok hover:underline" : "hover:text-fg hover:underline"}
            >
              Auto{auto ? " on" : ""}
            </button>
          ) : null}
          {session?.status === "ready" && token ? (
            <button
              type="button"
              onClick={() => {
                const snapshot = archive;
                const save = snapshot
                  ? api.saveArchive(token, params.id, snapshot).catch(() => undefined)
                  : Promise.resolve();
                void save.then(() => api.stopSession(token, params.id)).then((next) => {
                  setSession(next);
                  patchSession(next);
                });
              }}
              className="text-danger hover:underline"
            >
              Stop
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
