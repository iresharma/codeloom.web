"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { CUSTOM_MODEL, isKnownPreset } from "@/lib/models";
import { effortOptionsFor } from "@/lib/reasoningEffort";
import type { ModelCapability } from "@/lib/types";

import { EffortPicker } from "./EffortPicker";
import { ModelPicker } from "./ModelPicker";

const STORAGE_KEY = "codeloom.model";
const EFFORT_STORAGE_KEY = "codeloom.reasoning_effort";

type StoredModel = { preset: string; custom: string };

function readStored(): StoredModel {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preset: "", custom: "" };
    const parsed = JSON.parse(raw) as StoredModel;
    if (typeof parsed?.preset === "string") {
      const preset = parsed.preset;
      const custom = String(parsed.custom ?? "");
      if (preset && !isKnownPreset(preset)) {
        return { preset: CUSTOM_MODEL, custom: custom || preset };
      }
      return { preset, custom };
    }
  } catch {
    /* ignore quota / private mode */
  }
  return { preset: "", custom: "" };
}

function writeStored(value: StoredModel) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function resolveModel(preset: string, custom: string): string | undefined {
  if (!preset) return undefined;
  if (preset === CUSTOM_MODEL) {
    const id = custom.trim();
    return id || undefined;
  }
  return preset;
}

function readStoredEffort(): string {
  try {
    return window.localStorage.getItem(EFFORT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredEffort(value: string) {
  try {
    if (value) window.localStorage.setItem(EFFORT_STORAGE_KEY, value);
    else window.localStorage.removeItem(EFFORT_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function Composer({
  disabled,
  running,
  prefill,
  modelCapabilities,
  onSend,
  onAbort,
}: {
  disabled: boolean;
  running: boolean;
  prefill?: { id: number; text: string } | null;
  modelCapabilities: Record<string, ModelCapability>;
  onSend: (text: string, model?: string, reasoningEffort?: string) => void;
  onAbort: () => void;
}) {
  const [text, setText] = useState("");
  const [preset, setPreset] = useState("");
  const [custom, setCustom] = useState("");
  const [effort, setEffort] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = readStored();
    setPreset(stored.preset);
    setCustom(stored.custom);
    setEffort(readStoredEffort());
  }, []);

  const resolvedModel = resolveModel(preset, custom);
  const capability = resolvedModel ? modelCapabilities[resolvedModel] : undefined;
  const effortOptions = effortOptionsFor(capability);

  useEffect(() => {
    // A model that no longer offers reasoning (or doesn't allow the
    // previously-picked level) drops the stale selection rather than
    // silently sending an effort the model rejects.
    if (effort && !effortOptions.includes(effort)) {
      setEffort("");
      writeStoredEffort("");
    }
  }, [effort, effortOptions]);

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    field.current?.focus();
  }, [prefill]);

  function persist(nextPreset: string, nextCustom: string) {
    writeStored({ preset: nextPreset, custom: nextCustom });
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value, resolvedModel, effort || undefined);
    setText("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="border border-line bg-canvas">
      <label className="sr-only" htmlFor="composer">
        Message
      </label>
      <textarea
        id="composer"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={2}
        ref={field}
        placeholder={running ? "Agent is working…" : "Ask the orchestrator…"}
        className="min-h-[2.75rem] w-full resize-none bg-transparent px-3 py-2 text-[13px] text-fg outline-none placeholder:text-muted disabled:opacity-50"
      />
      <div className="flex items-center gap-2 border-t border-line px-2 py-1.5">
        <ModelPicker
          id="composer-model"
          value={preset}
          disabled={disabled}
          onChange={(next) => {
            setPreset(next);
            persist(next, custom);
          }}
        />
        {preset === CUSTOM_MODEL ? (
          <input
            value={custom}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              setCustom(next);
              persist(preset, next);
            }}
            placeholder="openrouter id"
            className="min-w-0 flex-1 border border-line bg-canvas px-2 py-1 text-[11px] text-fg outline-none placeholder:text-muted focus:border-muted disabled:opacity-40"
          />
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <EffortPicker
          id="composer-effort"
          value={effort}
          options={effortOptions}
          mandatory={capability?.mandatory}
          disabled={disabled}
          onChange={(next) => {
            setEffort(next);
            writeStoredEffort(next);
          }}
        />
        {running ? (
          <button
            type="button"
            onClick={onAbort}
            disabled={disabled}
            className="shrink-0 border border-line px-3 py-1.5 text-[12px] text-muted hover:text-fg disabled:opacity-40"
          >
            Stop
          </button>
        ) : null}
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="shrink-0 border border-line px-3 py-1.5 text-[12px] text-fg hover:bg-surface disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );
}
