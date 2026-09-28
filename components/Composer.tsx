"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

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
  onSend: (text: string) => void;
  onAbort: () => void;
}) {
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    field.current?.focus();
  }, [prefill]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
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
