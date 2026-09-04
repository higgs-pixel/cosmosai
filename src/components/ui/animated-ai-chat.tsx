"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Command, LoaderIcon, SendIcon, Sparkles, Trash2, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnimatedAIChatCommand<TMode extends string = string> = {
  icon: ReactNode;
  label: string;
  description: string;
  prefix: string;
  prompt: string;
  mode: TMode;
};

type AnimatedAIChatProps<TMode extends string = string> = {
  title: string;
  subtitle: string;
  hideHeader?: boolean;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onSend: (prompt?: string, mode?: TMode) => void;
  onCommandSelect?: (mode: TMode) => void;
  commands: Array<AnimatedAIChatCommand<TMode>>;
  isSending: boolean;
  statusLabel: string;
  statusMessage: string;
  modeLabel: string;
  audienceLabel: string;
  inputLength: number;
  maxLength: number;
  canClear: boolean;
  onClear: () => void;
};

function useAutoResizeTextarea(minHeight: number, maxHeight: number) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight))}px`;
    },
    [maxHeight, minHeight],
  );

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

export function AnimatedAIChat<TMode extends string = string>({
  title,
  subtitle,
  hideHeader = false,
  placeholder,
  value,
  onValueChange,
  onSend,
  onCommandSelect,
  commands,
  isSending,
  statusLabel,
  statusMessage,
  modeLabel,
  audienceLabel,
  inputLength,
  maxLength,
  canClear,
  onClear,
}: AnimatedAIChatProps<TMode>) {
  const prefersReducedMotion = useReducedMotion();
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea(88, 220);

  const matchingCommands = useMemo(() => {
    if (!value.startsWith("/") || value.includes(" ")) return commands;
    return commands.filter((command) => command.prefix.startsWith(value));
  }, [commands, value]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      setActiveSuggestion(0);
      return;
    }

    setShowCommandPalette(false);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const commandButton = document.querySelector("[data-cosmos-command-button]");

      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCommand(command: AnimatedAIChatCommand<TMode>) {
    onValueChange(command.prompt);
    onCommandSelect?.(command.mode);
    setShowCommandPalette(false);
    setRecentCommand(command.label);
    window.setTimeout(() => setRecentCommand(null), 1800);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      adjustHeight();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showCommandPalette && matchingCommands.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestion((current) => (current < matchingCommands.length - 1 ? current + 1 : 0));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestion((current) => (current > 0 ? current - 1 : matchingCommands.length - 1));
        return;
      }

      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        selectCommand(matchingCommands[activeSuggestion] ?? matchingCommands[0]);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setShowCommandPalette(false);
        return;
      }
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (value.trim() && !isSending) onSend();
    }
  }

  function submitPrompt(prompt?: string, mode?: TMode) {
    if (isSending) return;
    onSend(prompt, mode);
    adjustHeight(true);
  }

  return (
    <motion.div
      className="relative mx-auto w-full max-w-5xl"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute -inset-10 -z-10 overflow-hidden rounded-[2rem]">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-oxygen-400/10 blur-[88px]" />
        <div className="absolute bottom-0 right-12 h-64 w-64 rounded-full bg-ai/10 blur-[96px]" />
      </div>

      {!hideHeader ? (
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ai/20 bg-ai/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-ai">
            <Sparkles className="h-3.5 w-3.5" />
            {statusLabel}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-cosmos-white sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-cosmos-frost sm:text-base">
            {subtitle}
          </p>
        </div>
      ) : null}

      <motion.div
        className={cn(
          "relative overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] shadow-void backdrop-blur-2xl",
          inputFocused && "border-oxygen-400/35 shadow-glow-oxygen",
        )}
        animate={prefersReducedMotion ? undefined : { scale: inputFocused ? 1.006 : 1 }}
        transition={{ duration: 0.18 }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.35rem] border border-oxygen-300/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -inset-x-20 top-0 h-px animate-pulse bg-gradient-to-r from-transparent via-oxygen-300/70 to-transparent"
          aria-hidden="true"
        />
        <AnimatePresence>
          {showCommandPalette ? (
            <motion.div
              ref={commandPaletteRef}
              className="absolute bottom-full left-3 right-3 z-30 mb-3 overflow-hidden rounded-[1rem] border border-white/10 bg-cosmos-black/95 shadow-void backdrop-blur-2xl"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
            >
              <div className="max-h-[46vh] overflow-y-auto p-1.5">
                {(matchingCommands.length > 0 ? matchingCommands : commands).map((command, index) => (
                  <button
                    key={command.prefix}
                    type="button"
                    onClick={() => selectCommand(command)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-3 text-left transition",
                      activeSuggestion === index
                        ? "bg-oxygen-400/12 text-cosmos-white"
                        : "text-cosmos-frost hover:bg-white/[0.055] hover:text-cosmos-white",
                    )}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-oxygen-400">
                      {command.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{command.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-cosmos-mist">{command.description}</span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-cosmos-mist">
                      {command.prefix}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="p-3 sm:p-4">
          <textarea
            ref={textareaRef}
            value={value}
            maxLength={maxLength}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            rows={2}
            aria-label="Ask COSMOS"
            placeholder={placeholder}
            className="min-h-24 w-full resize-none bg-transparent px-2 py-3 text-base leading-7 text-cosmos-white outline-none placeholder:text-cosmos-slate sm:text-lg"
            style={{ overflow: "hidden" }}
          />
        </div>

        <div className="border-t border-white/[0.07] p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cosmos-mist">
              <button
                type="button"
                data-cosmos-command-button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowCommandPalette((current) => !current);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-semibold text-cosmos-frost transition hover:text-cosmos-white"
              >
                <Command className="h-3.5 w-3.5" />
                Commands
              </button>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{modeLabel}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{audienceLabel}</span>
              <span className="rounded-full border border-oxygen-400/15 bg-oxygen-400/10 px-3 py-1.5 text-oxygen-100">
                Ctrl/Cmd + Enter to send
              </span>
              <span>{inputLength}/{maxLength}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                disabled={!canClear || isSending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-cosmos-mist transition hover:text-cosmos-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <motion.button
                type="button"
                onClick={() => submitPrompt()}
                disabled={isSending || !value.trim()}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition",
                  value.trim()
                    ? "bg-oxygen-500 text-white shadow-glow-oxygen hover:bg-oxygen-400"
                    : "bg-white/[0.06] text-cosmos-mist",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {isSending ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                {isSending ? "Preparing" : "Send"}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {commands.map((command, index) => (
          <motion.button
            key={command.prefix}
            type="button"
            onClick={() => submitPrompt(command.prompt, command.mode)}
            disabled={isSending}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-cosmos-frost shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-oxygen-400/35 hover:bg-oxygen-400/10 hover:text-cosmos-white disabled:cursor-not-allowed disabled:opacity-50"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035 }}
          >
            <span className="text-oxygen-400">{command.icon}</span>
            {command.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {(isSending || recentCommand) && (
          <motion.div
            className="pointer-events-none mx-auto mt-4 flex w-fit items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm text-cosmos-frost shadow-void backdrop-blur-2xl"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ai/14 text-ai">
              {recentCommand ? <XIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </span>
            <span>{recentCommand ? `${recentCommand} shortcut loaded` : "COSMOS is analyzing NASA and research context..."}</span>
            {isSending ? <TypingDots /> : null}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-5 text-cosmos-mist">
        {statusMessage}
      </p>
    </motion.div>
  );
}

function TypingDots() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-ai"
          animate={prefersReducedMotion ? { opacity: 0.8 } : { opacity: [0.35, 1, 0.35], scale: [0.85, 1.12, 0.85] }}
          transition={prefersReducedMotion ? undefined : { duration: 1.1, repeat: Infinity, delay: dot * 0.13 }}
        />
      ))}
    </span>
  );
}
