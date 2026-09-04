"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bot, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MiniMessage = {
  sender: "cosmos" | "user" | "status";
  text: string;
};

type SuggestedPrompt = {
  label: string;
  prompt: string;
  mode: string;
};

type AiChatCardProps = {
  className?: string;
  onClose?: () => void;
  onSubmitPrompt: (prompt: string, mode?: string) => void;
  openFullAssistant: () => void;
  suggestedPrompts?: SuggestedPrompt[];
  autoFocus?: boolean;
};

const defaultPrompts: SuggestedPrompt[] = [
  {
    label: "Explain today's APOD",
    prompt: "Explain today's APOD clearly and include the NASA context when available.",
    mode: "apod",
  },
  {
    label: "Search NASA images",
    prompt: "Help me find NASA images about galaxies and explain what to look for.",
    mode: "nasa-media",
  },
  {
    label: "Find black hole research",
    prompt: "Find recent black hole research papers and summarize the strongest results for a student.",
    mode: "research",
  },
  {
    label: "Track near-Earth asteroids",
    prompt: "Track near-Earth asteroids and explain the closest safe approaches today.",
    mode: "asteroids",
  },
];

const particles = [
  "left-[12%] top-[18%]",
  "left-[78%] top-[16%]",
  "left-[30%] top-[34%]",
  "left-[88%] top-[42%]",
  "left-[16%] top-[62%]",
  "left-[58%] top-[72%]",
  "left-[82%] top-[82%]",
  "left-[38%] top-[88%]",
];

export function AIChatCard({
  className,
  onClose,
  onSubmitPrompt,
  openFullAssistant,
  suggestedPrompts = defaultPrompts,
  autoFocus = false,
}: AiChatCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MiniMessage[]>([
    {
      sender: "cosmos",
      text: "Ask me about NASA images, APOD, Mars, asteroids, research papers, or today's briefing.",
    },
  ]);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!autoFocus) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus]);

  useEffect(() => {
    const messagesEnd = messagesEndRef.current;
    if (!messagesEnd) return;

    const frame = window.requestAnimationFrame(() => {
      messagesEnd.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, prefersReducedMotion]);

  function submitPrompt(nextPrompt: string, mode?: string) {
    const trimmed = nextPrompt.trim();
    if (!trimmed || isOpening) return;

    setMessages((current) => [
      ...current,
      { sender: "user", text: trimmed },
      { sender: "status", text: "Opening full COSMOS assistant..." },
    ]);
    setInput("");
    setIsOpening(true);

    window.setTimeout(() => onSubmitPrompt(trimmed, mode), 240);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onClose?.();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitPrompt(input);
    }
  }

  return (
    <motion.section
      role="dialog"
      aria-label="Ask COSMOS mini assistant"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative h-[min(456px,calc(100svh-112px))] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-oxygen-400/24 bg-cosmos-black/94 p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.58),0_0_34px_rgba(56,189,248,0.16)] backdrop-blur-2xl",
        className,
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[conic-gradient(from_180deg_at_50%_50%,rgba(56,189,248,0.08),rgba(14,165,233,0.35),rgba(99,102,241,0.16),rgba(56,189,248,0.08))]"
        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(1rem-1px)] border border-white/10 bg-[radial-gradient(circle_at_22%_0%,rgba(56,189,248,0.16),transparent_34%),linear-gradient(180deg,rgba(5,8,18,0.98),rgba(3,4,10,0.97))]">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
          {!prefersReducedMotion
            ? particles.map((position, index) => (
                <span
                  key={position}
                  className={`absolute h-1 w-1 rounded-full bg-oxygen-300/35 ${position} animate-pulse`}
                  style={{ animationDelay: `${index * 180}ms` }}
                />
              ))
            : null}
        </div>

        <header className="relative z-10 flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-oxygen-400/25 bg-oxygen-400/10 shadow-glow-oxygen">
              <Bot className="h-5 w-5 text-oxygen-300" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-cosmos-white">Ask COSMOS</h2>
              <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
                NASA-aware preview
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cosmos-mist transition hover:border-oxygen-400/35 hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxygen-400"
            aria-label="Close Ask COSMOS preview"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="relative z-10 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={`${message.sender}-${index}-${message.text}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "max-w-[86%] rounded-2xl px-3 py-2 leading-6",
                  message.sender === "user"
                    ? "ml-auto border border-oxygen-400/25 bg-oxygen-400/14 text-cosmos-white"
                    : message.sender === "status"
                      ? "mr-auto border border-ai/20 bg-ai/10 text-ai"
                      : "mr-auto border border-white/10 bg-white/[0.055] text-cosmos-frost",
                )}
              >
                {message.text}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-px w-full" aria-hidden="true" />

          <div className="grid gap-2 pt-1">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
              Try a mission question
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => submitPrompt(item.prompt, item.mode)}
                  disabled={isOpening}
                  className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-left text-[11px] font-bold text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white disabled:cursor-wait disabled:opacity-60"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about APOD, Mars, JWST..."
              className="min-h-11 flex-1 rounded-full border border-white/10 bg-cosmos-black/62 px-4 text-sm font-medium text-cosmos-white outline-none transition placeholder:text-cosmos-slate focus:border-oxygen-400/45 focus:ring-2 focus:ring-oxygen-400/15"
              aria-label="Ask COSMOS preview prompt"
            />
            <button
              type="submit"
              disabled={!input.trim() || isOpening}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-oxygen-400/30 bg-oxygen-400/14 text-oxygen-200 transition hover:border-oxygen-300/50 hover:bg-oxygen-400/20 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Open Ask COSMOS with this prompt"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={openFullAssistant}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-bold text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
          >
            Open full Ask COSMOS
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>

        <Sparkles className="pointer-events-none absolute right-4 top-16 h-4 w-4 text-oxygen-300/55" aria-hidden="true" />
      </div>
    </motion.section>
  );
}
