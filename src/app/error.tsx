"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-cosmos-black px-6 text-cosmos-white">
      <section className="max-w-lg rounded-[1.25rem] border border-white/10 bg-cosmos-black/[0.72] p-6 text-center shadow-void backdrop-blur-2xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-mars-400">
          Signal interrupted
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          COSMOS could not render this view.
        </h1>
        <p className="mt-4 text-sm leading-6 text-cosmos-frost">
          {error.message || "A runtime error interrupted the current route."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-oxygen-500 px-5 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
