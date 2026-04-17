export function DemoBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-2 text-center no-print">
      <strong>Demo mode.</strong> Supabase is not configured — copy{" "}
      <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono">.env.example</code> to{" "}
      <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code> and add your project URL + anon key to enable data.
    </div>
  );
}
