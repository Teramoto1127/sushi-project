// 「今日の1問」を、同じ人には同じ日のあいだ同じ質問が出るように選ぶ(再読み込みで変わらない)。

// FNV-1a(32bit)
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickDaily<T>(items: readonly T[], seed: string): T | null {
  if (items.length === 0) return null;
  return items[hash(seed) % items.length];
}

// 休止中か(paused_until が未来なら休止中)
export function isPaused(pausedUntil: string | null | undefined, now: Date = new Date()): boolean {
  if (!pausedUntil) return false;
  const t = new Date(pausedUntil).getTime();
  return Number.isFinite(t) && t > now.getTime();
}

// 休止の長さ(日)。それ以外は再開扱い
export const PAUSE_DAYS = [7, 14, 30] as const;
