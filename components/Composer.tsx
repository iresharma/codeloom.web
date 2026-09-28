"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "codeloom.model";
const CUSTOM = "__custom__";
const PRESETS = [
  { value: "", label: "Default" },
  { value: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { value: "anthropic/claude-haiku-4.5", label: "Haiku 4.5" },
  { value: CUSTOM, label: "Custom" },
];

type StoredModel = { preset: string; custom: string };

function readStored(): StoredModel {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preset: "", custom: "" };
    const parsed = JSON.parse(raw) as StoredModel;
    if (typeof parsed?.preset === "string") {
      return { preset: parsed.preset, custom: String(parsed.custom ?? "") };
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
  if (preset === CUSTOM) {
    const id = custom.trim();
    return id || undefined;
  }
  return preset;
}

export function Composer({
  disabled,
  running,
  prefill,
  onSend,
  onAbort,
}: {
  disabled: boolean;
  running: boolean;
  prefill?: { id: number; text: string } | null;
  onSend: (text: string, model?: string) => void;
  onAbort: () => void;
}) {
  const [text, setText] = useState("");
  const [preset, setPreset] = useState("");
  const [custom, setCustom] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = readStored();
    setPreset(stored.preset);
    setCustom(stored.custom);
  }, []);

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
    onSend(value, resolveModel(preset, custom));
    setText("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
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
        className="min-h-[2.75rem] flex-1 resize-none border border-line bg-canvas px-3 py-2 text-[13px] text-fg outline-none placeholder:text-muted focus:border-muted disabled:opacity-50"
      />
      <div className="flex flex-col gap-1.5">
        <label className="sr-only" htmlFor="composer-model">
          Model
        </label>
        <select
          id="composer-model"
          value={preset}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            setPreset(next);
            persist(next, custom);
          }}
          className="max-w-[9.5rem] border border-line bg-canvas px-2 py-1.5 text-[11px] text-fg outline-none focus:border-muted disabled:opacity-40"
        >
          {PRESETS.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {preset === CUSTOM ? (
          <input
            value={custom}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              setCustom(next);
              persist(preset, next);
            }}
            placeholder="openrouter id"
            className="w-[9.5rem] border border-line bg-canvas px-2 py-1 text-[11px] text-fg outline-none placeholder:text-muted focus:border-muted disabled:opacity-40"
          />
        ) : null}
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="border border-line px-3 py-1.5 text-[12px] text-fg hover:bg-surface disabled:opacity-40"
        >
          Send
        </button>
        {running ? (
          <button
            type="button"
            onClick={onAbort}
            disabled={disabled}
            className="border border-line px-3 py-1.5 text-[12px] text-muted hover:text-fg disabled:opacity-40"
          >
            Stop
          </button>
        ) : null}
      </div>
    </form>
  );
}
