"use client";

import { effortLabel } from "@/lib/reasoningEffort";

export function EffortPicker({
  id,
  value,
  options,
  mandatory,
  disabled,
  onChange,
}: {
  id?: string;
  value: string;
  options: string[];
  mandatory?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-label="Reasoning effort"
      onChange={(event) => onChange(event.target.value)}
      className="shrink-0 border border-line bg-canvas px-2 py-1.5 text-[11px] text-fg outline-none hover:border-muted disabled:opacity-40"
    >
      {mandatory ? null : <option value="">Default effort</option>}
      {options.map((level) => (
        <option key={level} value={level}>
          {effortLabel(level)}
        </option>
      ))}
    </select>
  );
}
