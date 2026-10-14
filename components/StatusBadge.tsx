// 状態は、色だけでなく文字でも示す(色が見分けにくい人にも伝わるように)。
const MAP: Record<string, { label: string; className: string }> = {
  open: { label: "回答募集中", className: "text-[var(--accent)]" },
  answered: { label: "回答あり", className: "text-[#8a5a00] dark:text-[#e0b25a]" },
  solved: { label: "解決済み", className: "text-muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "text-muted" };
  return <span className={`text-[13px] font-bold ${s.className}`}>{s.label}</span>;
}
