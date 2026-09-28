"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { wsUrl } from "./config";
import { initialEngineState, reduceEngine, type EngineState } from "./engine";
import type { EngineEvent } from "./types";

export function useSessionStream(sessionId: string | null, token: string | null, enabled: boolean) {
  const [state, setState] = useState<EngineState>(initialEngineState);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId || !token || !enabled) {
      return;
    }
    setState(initialEngineState);
    const socket = new WebSocket(wsUrl(sessionId, token));
    socketRef.current = socket;
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as EngineEvent;
        setState((current) => reduceEngine(current, event));
      } catch {
        setState((current) => ({ ...current, error: "malformed engine event" }));
      }
    };
    return () => {
      socket.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [sessionId, token, enabled]);

  const send = useCallback((command: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(command));
  }, []);

  const selectAgent = useCallback(
    (agentId: string) => {
      if (!agentId) {
        setState((current) => ({ ...current, selectedAgentId: "" }));
        send({ type: "RequestContext", agent_id: "" });
        return;
      }
      setState((current) => ({ ...current, selectedAgentId: agentId }));
      send({ type: "RequestAgentTranscript", agent_id: agentId });
      send({ type: "RequestContext", agent_id: agentId });
    },
    [send],
  );

  return { state, connected, send, selectAgent, setState };
}
