const MAP: Record<string, { label: string; className: string }> = {
  open: { label: "回答募集中", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  answered: { label: "回答あり", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  solved: { label: "解決済み", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
  );
}
