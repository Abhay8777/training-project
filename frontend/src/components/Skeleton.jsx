export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
      <div className="mt-4 h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="mt-2 h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800/70 rounded" />
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
