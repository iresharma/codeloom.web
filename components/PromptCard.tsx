"use client";

import { useState } from "react";

import { promptActions, promptTitle, splitPromptQuestion } from "@/lib/prompt";
import type { PendingPrompt } from "@/lib/types";

export function PromptCard({
  prompt,
  onAnswer,
}: {
  prompt: PendingPrompt;
  onAnswer: (text: string) => void;
}) {
  const [text, setText] = useState(prompt.default ?? "");
  const [sent, setSent] = useState(false);
  const actions = promptActions(prompt);
  const showText = !actions;
  const { headline, meta, body } = splitPromptQuestion(prompt.question);

  function answer(value: string) {
    if (sent || !value.trim()) return;
    setSent(true);
    onAnswer(value.trim());
  }

  return (
    <div className="flex max-h-56 min-h-0 flex-col overflow-hidden border border-warn/50 bg-surface">
      <div className="shrink-0 px-3 pt-3">
        <div className="text-[12px] text-warn">{promptTitle(prompt)}</div>
        <p className="mt-1 text-[13px] leading-5 text-fg">{headline}</p>
        {meta ? <div className="mt-0.5 truncate font-mono text-[11px] text-muted">{meta}</div> : null}
      </div>
      {body ? (
        <pre className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-4 text-muted">
          {body}
        </pre>
      ) : null}
      <div className="shrink-0 border-t border-line px-3 py-2">
        {actions ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={`${action.label}:${action.value}`}
                type="button"
                onClick={() => answer(action.value)}
                disabled={sent}
                className={
                  action.tone === "ok"
                    ? "border border-ok/50 bg-ok/10 px-3 py-1.5 text-[12px] text-fg hover:bg-ok/20 disabled:opacity-40"
                    : action.tone === "danger"
                      ? "border border-line px-3 py-1.5 text-[12px] text-muted hover:border-danger/50 hover:text-danger disabled:opacity-40"
                      : "border border-line px-3 py-1.5 text-[12px] text-fg hover:bg-canvas disabled:opacity-40"
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
        {showText ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              answer(text);
            }}
          >
            <label className="sr-only" htmlFor="prompt-answer">
              Answer
            </label>
            <input
              id="prompt-answer"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type a reply"
              disabled={sent}
              className="flex-1 border border-line bg-canvas px-2 py-1.5 text-[13px] outline-none focus:border-muted disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={sent || !text.trim()}
              className="border border-line px-3 py-1.5 text-[12px] text-fg hover:bg-canvas disabled:opacity-40"
            >
              Reply
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
