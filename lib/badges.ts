// 称号。ランキングは作らず、「何で力になれたか」を認めるためだけに使う。
// 回答の量そのものではなく、後輩から返ってきた感謝(助かった・解決)を元に計算する。
import { HELPFUL_REASONS } from "@/lib/feedback";
import type { Stats } from "@/lib/contribution";

export type Badge = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

const HELPFUL_LADDER = [
  { at: 10, title: "頼れる先輩", icon: "🌱" },
  { at: 30, title: "みんなの先輩", icon: "🌿" },
  { at: 100, title: "伝説の先輩", icon: "🌳" },
] as const;

const SOLVED_LADDER = [
  { at: 5, title: "解決の立役者", icon: "🔑" },
  { at: 20, title: "解決請負人", icon: "🗝️" },
] as const;

const TAG_LADDER = [
  { at: 3, label: "見習い", icon: "⭐" },
  { at: 10, label: "頼れる存在", icon: "⭐⭐" },
  { at: 30, label: "師範", icon: "⭐⭐⭐" },
] as const;

const REASON_BADGES: Record<string, { title: string; icon: string }> = {
  example: { title: "具体例の達人", icon: "💡" },
  clear_steps: { title: "道案内の名人", icon: "🧭" },
  encouraging: { title: "励まし上手", icon: "🌟" },
  good_links: { title: "リンク職人", icon: "🔗" },
};
const REASON_BADGE_AT = 5;

// 到達した一番上の段だけを返す
function highest<T extends { at: number }>(ladder: readonly T[], value: number): T | null {
  let hit: T | null = null;
  for (const step of ladder) if (value >= step.at) hit = step;
  return hit;
}

export function computeBadges(s: Stats): Badge[] {
  const out: Badge[] = [];

  if (s.answers >= 1) {
    out.push({ id: "first-answer", icon: "✍️", title: "はじめての回答", description: "最初の回答を投稿しました。" });
  }
  if (s.helpful >= 1) {
    out.push({ id: "first-thanks", icon: "👍", title: "はじめての「助かった」", description: "後輩から最初の「助かった」が届きました。" });
  }
  if (s.solved >= 1) {
    out.push({ id: "first-solved", icon: "✅", title: "はじめての解決", description: "回答が解決の決め手になりました。" });
  }

  const h = highest(HELPFUL_LADDER, s.helpful);
  if (h) {
    out.push({ id: `helpful-${h.at}`, icon: h.icon, title: h.title, description: `「助かった」が${h.at}件を超えました。` });
  }
  const sv = highest(SOLVED_LADDER, s.solved);
  if (sv) {
    out.push({ id: `solved-${sv.at}`, icon: sv.icon, title: sv.title, description: `${sv.at}件の質問で解決の決め手になりました。` });
  }

  for (const r of HELPFUL_REASONS) {
    const b = REASON_BADGES[r.key];
    const n = s.reasons[r.key] ?? 0;
    if (b && n >= REASON_BADGE_AT) {
      out.push({ id: `reason-${r.key}`, icon: b.icon, title: b.title, description: `「${r.label}」と${n}回伝えてもらいました。` });
    }
  }

  // タグごと。件数の多い順に、同じ件数なら名前順
  const tagBadges = Object.entries(s.tags)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .flatMap(([tag, n]) => {
      const t = highest(TAG_LADDER, n);
      return t
        ? [{ id: `tag-${tag}`, icon: t.icon, title: `${tag} ${t.label}`, description: `${tag} の質問${n}件で力になりました。` }]
        : [];
    });

  return [...out, ...tagBadges];
}

// 「助かった」の次の称号まで。到達済みで最上位なら null
export function nextHelpfulGoal(helpful: number): { title: string; remaining: number } | null {
  const next = HELPFUL_LADDER.find((s) => helpful < s.at);
  return next ? { title: next.title, remaining: next.at - helpful } : null;
}

// もらった理由を多い順に(強みの表示用)
export function strengths(reasons: Record<string, number>, top = 3) {
  return HELPFUL_REASONS.map((r) => ({ key: r.key, label: r.label, count: reasons[r.key] ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}
