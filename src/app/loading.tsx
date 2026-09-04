export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-cosmos-black px-6 text-cosmos-white">
      <div className="text-center">
        <div className="mx-auto mb-5 h-10 w-10 rounded-full border border-oxygen-400/30 border-t-oxygen-400 animate-spin" />
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
          Acquiring signal
        </p>
      </div>
    </main>
  );
}
