// 貢献の集計(DBの contribution_stats 関数の戻り値)と、月ごとのふりかえりの計算。
// 画面側は、ここで整えた値を表示するだけにする。

export type Stats = {
  answers: number;
  helpful: number;
  solved: number;
  reasons: Record<string, number>;
  tags: Record<string, number>;
  firstAt: string | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function countMap(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
    const c = num(n);
    if (c > 0) out[k] = c;
  }
  return out;
}

// RPCの戻り値(jsonb)を安全に Stats にする。null(非公開など)や想定外の形は null を返す
export function parseStats(raw: unknown): Stats | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    answers: num(r.answers),
    helpful: num(r.helpful),
    solved: num(r.solved),
    reasons: countMap(r.reasons),
    tags: countMap(r.tags),
    firstAt: typeof r.first_at === "string" ? r.first_at : null,
  };
}

// ---- 月(日本時間)の扱い ----
const JST_MS = 9 * 60 * 60 * 1000;

const toJst = (d: Date | string) => new Date(new Date(d).getTime() + JST_MS).toISOString();

export const monthKey = (d: Date | string) => toJst(d).slice(0, 7); // "2026-10"
export const dayKey = (d: Date | string) => toJst(d).slice(0, 10); // "2026-10-13"

export function prevMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${y}年${m}月`;
};

// ---- 月ごとのふりかえり ----
export type NotificationLite = {
  type: string;
  created_at: string;
  reasons: string[] | null;
  comment: string | null;
};

export type MonthSummary = {
  key: string;
  helpful: number;
  solved: number;
  /** 後輩からの一言(新しい順、最大 maxQuotes 件) */
  quotes: string[];
};

export function summarizeMonth(rows: NotificationLite[], key: string, maxQuotes = 3): MonthSummary {
  const inMonth = rows
    .filter((r) => monthKey(r.created_at) === key)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    key,
    helpful: inMonth.filter((r) => r.type === "helpful").length,
    solved: inMonth.filter((r) => r.type === "solved").length,
    quotes: inMonth
      .map((r) => r.comment?.trim() ?? "")
      .filter((c) => c.length > 0)
      .slice(0, maxQuotes),
  };
}

// 前の月との差を、プレッシャーにならない言い方で返す(減っていても責めない)
export function monthTrend(cur: MonthSummary, prev: MonthSummary): string | null {
  const c = cur.helpful + cur.solved;
  const p = prev.helpful + prev.solved;
  if (c === 0) return null;
  if (p === 0) return "今月から、あなたの回答がちゃんと届き始めています。";
  if (c > p) return "先月より、感謝が増えています。";
  return null;
}
