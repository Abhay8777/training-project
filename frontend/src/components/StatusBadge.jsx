export default function StatusBadge({ status }) {
  const styles = {
    PRESENT:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    ABSENT:
      'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    LATE:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  };

  const labels = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    LATE: 'Late',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'PRESENT'
            ? 'bg-emerald-500'
            : status === 'ABSENT'
            ? 'bg-rose-500'
            : 'bg-amber-500'
        }`}
      />
      {labels[status] || status}
    </span>
  );
}
