"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { wsUrl } from "./config";
import { initialEngineState, reduceEngine, type EngineState } from "./engine";
import type { EngineEvent } from "./types";

const RETRY_LIMIT_MS = 15_000;

function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), RETRY_LIMIT_MS);
}

function shouldRetry(code: number): boolean {
  return code !== 4401 && code !== 4404;
}

export function useSessionStream(sessionId: string | null, token: string | null, enabled: boolean) {
  const [state, setState] = useState<EngineState>(initialEngineState);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const liveRef = useRef<EngineState>(initialEngineState);

  useEffect(() => {
    if (!sessionId || !token || !enabled) {
      return;
    }
    let stopped = false;
    let attempt = 0;
    let timer: number | undefined;
    let socket: WebSocket | null = null;
    liveRef.current = initialEngineState;
    setState(initialEngineState);
    setConnected(false);

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(wsUrl(sessionId, token));
      socketRef.current = socket;
      socket.onopen = () => {
        if (stopped) return;
        attempt = 0;
        liveRef.current = initialEngineState;
        setState(initialEngineState);
        setConnected(true);
      };
      socket.onmessage = (message) => {
        if (stopped) return;
        try {
          const event = JSON.parse(message.data) as EngineEvent;
          liveRef.current = reduceEngine(liveRef.current, event);
        } catch {
          liveRef.current = { ...liveRef.current, error: "malformed engine event" };
        }
        setState(liveRef.current);
      };
      socket.onerror = () => {
        socket?.close();
      };
      socket.onclose = (event) => {
        if (socketRef.current === socket) socketRef.current = null;
        setConnected(false);
        if (stopped || !shouldRetry(event.code)) return;
        attempt += 1;
        liveRef.current = {
          ...liveRef.current,
          error: "Connection lost. Reconnecting…",
        };
        setState(liveRef.current);
        timer = window.setTimeout(connect, retryDelay(attempt));
      };
    };

    connect();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
      setConnected(false);
    };
  }, [sessionId, token, enabled]);

  const send = useCallback((command: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      liveRef.current = {
        ...liveRef.current,
        error: "Not connected. The message was not sent.",
      };
      setState(liveRef.current);
      return;
    }
    socket.send(JSON.stringify(command));
  }, []);

  const selectAgent = useCallback(
    (agentId: string) => {
      if (!agentId) {
        liveRef.current = { ...liveRef.current, selectedAgentId: "" };
        setState(liveRef.current);
        send({ type: "RequestContext", agent_id: "" });
        return;
      }
      liveRef.current = { ...liveRef.current, selectedAgentId: agentId };
      setState(liveRef.current);
      send({ type: "RequestAgentTranscript", agent_id: agentId });
      send({ type: "RequestContext", agent_id: agentId });
    },
    [send],
  );

  const setStatePublic = useCallback((update: EngineState | ((current: EngineState) => EngineState)) => {
    const next = typeof update === "function" ? update(liveRef.current) : update;
    liveRef.current = next;
    setState(next);
  }, []);

  return { state, connected, send, selectAgent, setState: setStatePublic };
}
