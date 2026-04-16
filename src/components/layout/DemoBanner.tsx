export function DemoBanner() {
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 text-center no-print">
      <strong>Demo mode.</strong> Supabase is not configured — copy <code className="mx-1 rounded bg-amber-200 px-1 py-0.5">.env.example</code> to
      <code className="mx-1 rounded bg-amber-200 px-1 py-0.5">.env.local</code> and add your project URL + anon key to enable data.
    </div>
  );
}
