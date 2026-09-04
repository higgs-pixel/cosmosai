"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowRight, Check, Chrome, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { startGoogleOAuth } from "@/utils/supabase/client";
import type { AuthActionState } from "@/utils/supabase/types";

type AuthMode = "login" | "signup" | "forgot";
type AuthAction = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

type CosmosAuthCardProps = {
  mode: AuthMode;
  action: AuthAction;
  configurationMessage?: string | null;
  initialError?: string | null;
  initialSuccess?: string | null;
};

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    submit: string;
    pending: string;
  }
> = {
  login: {
    title: "Welcome Back",
    subtitle: "Sign in to continue exploring COSMOS AI",
    submit: "Sign in",
    pending: "Opening observatory",
  },
  signup: {
    title: "Join COSMOS AI",
    subtitle: "Create your account for saved discoveries and future mission tools",
    submit: "Create account",
    pending: "Creating account",
  },
  forgot: {
    title: "Reset Password",
    subtitle: "Send a secure reset link to your COSMOS AI email",
    submit: "Send reset link",
    pending: "Sending link",
  },
};

function Field({
  icon,
  label,
  name,
  type,
  autoComplete,
  placeholder,
  focused,
  onFocus,
  onBlur,
  right,
}: {
  icon: ReactNode;
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  right?: ReactNode;
}) {
  return (
    <motion.label
      className="group/field relative block"
      whileHover={{ scale: 1.008 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
    >
      <span className="sr-only">{label}</span>
      <span
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 transition",
          focused ? "text-oxygen-300" : "text-cosmos-mist/55",
        )}
      >
        {icon}
      </span>
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        className="relative h-11 w-full rounded-lg border border-white/10 bg-white/[0.055] px-10 text-sm text-cosmos-white outline-none transition placeholder:text-cosmos-mist/40 focus:border-oxygen-300/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-oxygen-400/15"
      />
      <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-oxygen-400/0 via-oxygen-300/8 to-ai-violet/0 opacity-0 transition group-focus-within/field:opacity-100" />
      {right}
    </motion.label>
  );
}

function AnimatedBeams() {
  const beam = "absolute rounded-full bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent";

  return (
    <div className="pointer-events-none absolute -inset-px overflow-hidden rounded-2xl" aria-hidden="true">
      <motion.span
        className={cn(beam, "left-[-55%] top-0 h-px w-[55%]")}
        animate={{ x: ["0%", "290%"], opacity: [0.1, 0.55, 0.1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute right-0 top-[-55%] h-[55%] w-px rounded-full bg-gradient-to-b from-transparent via-violet-200/70 to-transparent"
        animate={{ y: ["0%", "290%"], opacity: [0.1, 0.45, 0.1] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.span
        className={cn(beam, "bottom-0 right-[-55%] h-px w-[55%]")}
        animate={{ x: ["0%", "-290%"], opacity: [0.1, 0.5, 0.1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
      />
      <motion.span
        className="absolute bottom-[-55%] left-0 h-[55%] w-px rounded-full bg-gradient-to-b from-transparent via-cyan-200/65 to-transparent"
        animate={{ y: ["0%", "-290%"], opacity: [0.1, 0.45, 0.1] }}
        transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
      />
    </div>
  );
}

export function CosmosAuthCard({
  mode,
  action,
  configurationMessage,
  initialError,
  initialSuccess,
}: CosmosAuthCardProps) {
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [state, formAction, isPending] = useActionState(action, {});

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-260, 260], reduceMotion ? [0, 0] : [5, -5]);
  const rotateY = useTransform(mouseX, [-260, 260], reduceMotion ? [0, 0] : [-5, 5]);
  const copy = modeCopy[mode];

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  }

  function resetTilt() {
    mouseX.set(0);
    mouseY.set(0);
  }

  async function handleGoogleSignIn() {
    setGoogleError(null);
    setIsGooglePending(true);

    try {
      await startGoogleOAuth();
    } catch {
      setGoogleError("Google sign-in could not be started. Please try again.");
      setIsGooglePending(false);
    }
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cosmos-black px-4 py-24 text-cosmos-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_75%_80%,rgba(139,92,246,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#03040a_54%,#000_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20px 20px, rgba(255,255,255,0.72) 1px, transparent 1.5px)",
          backgroundSize: "58px 58px",
        }}
      />
      <motion.div
        className="absolute left-1/2 top-0 h-[42vh] w-[85vw] -translate-x-1/2 rounded-b-full bg-cyan-400/12 blur-3xl"
        animate={reduceMotion ? undefined : { opacity: [0.25, 0.48, 0.25], scale: [0.98, 1.04, 0.98] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 w-full max-w-md"
        style={{ perspective: 1400 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={resetTilt}
        >
          <div className="group relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-300/35 via-white/5 to-violet-400/30 opacity-70 blur-sm transition group-hover:opacity-100" />
            <AnimatedBeams />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/62 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_28%,rgba(56,189,248,0.05)_62%,transparent)]" />
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />

              <div className="relative text-center">
                <motion.div
                  initial={{ scale: 0.65, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-cyan-200/25 bg-cyan-300/10 shadow-[0_0_35px_rgba(56,189,248,0.22)]"
                >
                  <span className="bg-gradient-to-b from-white to-cyan-200 bg-clip-text text-xl font-black text-transparent">
                    C
                  </span>
                </motion.div>
                <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-oxygen-300">
                  COSMOS AI
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white">{copy.title}</h1>
                <p className="mt-2 text-sm leading-6 text-cosmos-frost">{copy.subtitle}</p>
              </div>

              <form action={formAction} className="relative mt-6 space-y-4">
                {mode === "signup" ? (
                  <Field
                    icon={<User className="h-4 w-4" />}
                    label="Full name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Full name"
                    focused={focusedInput === "fullName"}
                    onFocus={() => setFocusedInput("fullName")}
                    onBlur={() => setFocusedInput(null)}
                  />
                ) : null}

                <Field
                  icon={<Mail className="h-4 w-4" />}
                  label="Email address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  focused={focusedInput === "email"}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />

                {mode !== "forgot" ? (
                  <Field
                    icon={<Lock className="h-4 w-4" />}
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="Password"
                    focused={focusedInput === "password"}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    right={
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-cosmos-mist/55 transition hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                ) : null}

                {mode === "signup" ? (
                  <Field
                    icon={<Lock className="h-4 w-4" />}
                    label="Confirm password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    focused={focusedInput === "confirmPassword"}
                    onFocus={() => setFocusedInput("confirmPassword")}
                    onBlur={() => setFocusedInput(null)}
                    right={
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-cosmos-mist/55 transition hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                ) : null}

                {mode === "login" ? (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <label className="flex cursor-pointer items-center gap-2 text-cosmos-frost">
                      <span className="relative grid h-4 w-4 place-items-center">
                        <input
                          type="checkbox"
                          name="remember"
                          checked={rememberMe}
                          onChange={() => setRememberMe((value) => !value)}
                          className="peer h-4 w-4 appearance-none rounded border border-white/20 bg-white/5 transition checked:border-cyan-200 checked:bg-cyan-200"
                        />
                        {rememberMe ? <Check className="pointer-events-none absolute h-3 w-3 text-slate-950" /> : null}
                      </span>
                      Remember me
                    </label>
                    <Link href="/forgot-password" className="text-cosmos-frost transition hover:text-white">
                      Forgot password?
                    </Link>
                  </div>
                ) : null}

                {configurationMessage ? (
                  <div className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm leading-6 text-amber-50">
                    {configurationMessage}
                  </div>
                ) : null}

                {state.error || googleError || initialError ? (
                  <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-100">
                    {state.error || googleError || initialError}
                  </div>
                ) : null}
                {state.success || initialSuccess ? (
                  <div className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm leading-6 text-emerald-100">
                    {state.success || initialSuccess}
                  </div>
                ) : null}

                <motion.button
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={isPending}
                  className="group/button relative h-11 w-full overflow-hidden rounded-lg bg-cosmos-white text-sm font-bold text-slate-950 shadow-[0_0_32px_rgba(125,211,252,0.18)] transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent transition duration-700 group-hover/button:translate-x-[120%]" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isPending ? copy.pending : copy.submit}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </motion.button>
              </form>

              {mode !== "forgot" ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGooglePending || Boolean(configurationMessage)}
                  className="relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] text-sm font-semibold text-cosmos-white transition hover:border-cyan-200/30 hover:bg-white/[0.075] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Chrome className="h-4 w-4 text-oxygen-300" />
                  {isGooglePending ? "Connecting to Google" : "Continue with Google"}
                </button>
              ) : null}

              <div className="relative mt-5 text-center text-sm text-cosmos-frost">
                {mode === "login" ? (
                  <>
                    New to COSMOS?{" "}
                    <Link href="/signup" className="font-semibold text-oxygen-300 hover:text-white">
                      Create an account
                    </Link>
                  </>
                ) : null}
                {mode === "signup" ? (
                  <>
                    Already exploring?{" "}
                    <Link href="/login" className="font-semibold text-oxygen-300 hover:text-white">
                      Sign in
                    </Link>
                  </>
                ) : null}
                {mode === "forgot" ? (
                  <>
                    Remembered it?{" "}
                    <Link href="/login" className="font-semibold text-oxygen-300 hover:text-white">
                      Return to login
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
