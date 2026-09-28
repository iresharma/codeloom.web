"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  MODEL_GROUPS,
  MODEL_OPTIONS,
  modelDetail,
  modelOption,
  type ModelOption,
} from "@/lib/models";

import { ProviderMark } from "./ProviderMark";

function groupedOptions() {
  return MODEL_GROUPS.map((group) => ({
    ...group,
    options: MODEL_OPTIONS.filter((option) => option.group === group.id),
  })).filter((group) => group.options.length > 0);
}

type MenuBox = { bottom: number; right: number };

export function ModelPicker({
  id,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<MenuBox | null>(null);
  const [active, setActive] = useState(value);
  const selected = modelOption(value) ?? MODEL_OPTIONS[0];
  const groups = useMemo(groupedOptions, []);

  useEffect(() => {
    if (open) setActive(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function sync() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({
        bottom: window.innerHeight - rect.top + 4,
        right: window.innerWidth - rect.right,
      });
    }
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const node = event.target as Node;
      if (trigger.current?.contains(node) || menu.current?.contains(node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const index = MODEL_OPTIONS.findIndex((option) => option.value === active);
        const next = MODEL_OPTIONS[(index + step + MODEL_OPTIONS.length) % MODEL_OPTIONS.length];
        setActive(next.value);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActive(MODEL_OPTIONS[0].value);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActive(MODEL_OPTIONS[MODEL_OPTIONS.length - 1].value);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onChange(active);
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, active, onChange]);

  function pick(option: ModelOption) {
    onChange(option.value);
    setOpen(false);
  }

  const panel =
    open && box
      ? createPortal(
          <div
            ref={menu}
            id={listId}
            role="listbox"
            aria-label="Model"
            style={{ bottom: box.bottom, right: box.right }}
            className="fixed z-50 max-h-[min(22rem,70vh)] w-[21rem] overflow-y-auto border border-line bg-surface"
          >
            {groups.map((group) => (
              <div key={group.id}>
                <div className="sticky top-0 border-b border-line bg-surface px-2.5 py-1.5 text-[10px] tracking-wide text-muted uppercase">
                  {group.label}
                </div>
                {group.options.map((option) => {
                  const isActive = option.value === active;
                  const isSelected = option.value === value;
                  const detail = modelDetail(option);
                  const meta = [
                    option.label,
                    option.size,
                    option.rank != null ? `OpenRouter #${option.rank}` : null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={option.value || "default"}
                      ref={isActive ? activeRef : undefined}
                      type="button"
                      role="option"
                      aria-label={meta}
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(option.value)}
                      onClick={() => pick(option)}
                      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left ${
                        isActive ? "bg-canvas" : ""
                      }`}
                    >
                      <ProviderMark provider={option.provider} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] text-fg">{option.label}</span>
                        <span className="block truncate font-mono text-[10px] text-muted">{detail}</span>
                      </span>
                      {option.rank != null ? (
                        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted tabular-nums">
                          #{option.rank}
                        </span>
                      ) : null}
                      {isSelected ? (
                        <span className="text-[10px] text-ok" aria-hidden>
                          ✓
                        </span>
                      ) : (
                        <span className="w-2.5 shrink-0" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        type="button"
        ref={trigger}
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Model: ${selected.label}`}
        onClick={() => setOpen((current) => !current)}
        className="flex w-[12.5rem] items-center gap-2 border border-line bg-canvas px-2 py-1.5 text-left text-[11px] text-fg hover:border-muted disabled:opacity-40"
      >
        <ProviderMark provider={selected.provider} />
        <span className="min-w-0 flex-1 truncate">{selected.label}</span>
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden className="shrink-0 text-muted">
          <path fill="currentColor" d={open ? "M2 8.2 6 3.8l4 4.4H2Z" : "M2 3.8 6 8.2l4-4.4H2Z"} />
        </svg>
      </button>
      {panel}
    </div>
  );
}
