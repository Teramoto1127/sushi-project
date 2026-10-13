// 質問に合う先輩を、タグと公開された実績から選ぶ(外部のAIサービスは使わない)。
// 質問の内容を外に送らず、費用もかからない。なぜおすすめなのかを理由として必ず返す。
import type { Stats } from "@/lib/contribution";
import { isPaused } from "@/lib/daily";

export type Candidate = {
  userId: string;
  displayName: string;
  grade: number | null;
  seminar: string | null;
  bio: string;
  languages: string[];
  courses: string[];
  topics: string[];
  consultOk: boolean;
  pausedUntil: string | null;
  /** 貢献ページを公開している人だけ入る(非公開は null) */
  stats: Stats | null;
};

export type QuestionLike = { title: string; body: string; tags: string[] };

export type Recommendation = {
  candidate: Candidate;
  score: number;
  /** 画面にそのまま出せる、おすすめの理由(多くても3つ) */
  reasons: string[];
};

const W_TAG_MATCH = 4; // 質問のタグと、先輩の得意タグが一致
const W_TEXT_MATCH = 2; // 質問の文章に、先輩の得意タグが出てくる
const W_STATS = 0.4; // そのタグで力になった実績(1件あたり。上限あり)
const STATS_CAP = 10;
const MAX_TAG_MATCHES = 3;
const MAX_TEXT_MATCHES = 2;
const MAX_REASONS = 3;

const norm = (s: string) => s.trim().toLowerCase();

export const profileTags = (c: Pick<Candidate, "languages" | "courses" | "topics">): string[] =>
  Array.from(new Set([...c.languages, ...c.courses, ...c.topics].map((t) => t.trim()).filter(Boolean)));

const isAscii = (s: string) => /^[\x20-\x7E]+$/.test(s);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 文章にタグが出てくるか。英数字のタグは単語として(「Go」が「Google」に反応しない)、日本語は部分一致
export function mentions(text: string, tag: string): boolean {
  const t = tag.trim();
  if (t.length < 2) return false;
  if (isAscii(t)) {
    return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(t)}(?![A-Za-z0-9])`, "i").test(text);
  }
  return text.includes(t);
}

type Options = {
  now?: Date;
  /** 質問した本人は候補から外す */
  authorId?: string;
  limit?: number;
  /** 既定は true。連絡できる(相談OKの)先輩だけをおすすめする */
  requireConsultOk?: boolean;
};

// タグや文章の一致だけで決まる点数(実績は含まない)。実績を取りに行く候補を絞るのに使う。
export function baseScore(q: QuestionLike, c: Candidate): number {
  return scoreOne(q, { ...c, stats: null }).score;
}

function scoreOne(q: QuestionLike, c: Candidate): { score: number; reasons: string[]; matched: string[] } {
  const qTags = new Set(q.tags.map(norm));
  const text = `${q.title}\n${q.body}`;
  const mine = profileTags(c);

  const reasons: string[] = [];
  const matched: string[] = [];
  let score = 0;

  const tagHits = mine.filter((t) => qTags.has(norm(t))).slice(0, MAX_TAG_MATCHES);
  for (const t of tagHits) {
    score += W_TAG_MATCH;
    matched.push(t);
    reasons.push(`#${t} が得意分野です`);
  }

  const textHits = mine
    .filter((t) => !qTags.has(norm(t)) && mentions(text, t))
    .slice(0, MAX_TEXT_MATCHES);
  for (const t of textHits) {
    score += W_TEXT_MATCH;
    matched.push(t);
    reasons.push(`質問に「${t}」が出てきます(得意分野)`);
  }

  // 実績: 一致したタグで、実際に力になった質問の数(公開している人だけ)
  if (c.stats && matched.length > 0) {
    let best: { tag: string; n: number } | null = null;
    for (const t of matched) {
      const n = c.stats.tags[t] ?? 0;
      if (n > 0) {
        score += Math.min(n, STATS_CAP) * W_STATS;
        if (!best || n > best.n) best = { tag: t, n };
      }
    }
    if (best) reasons.push(`#${best.tag} の質問で${best.n}件、力になっています`);
  }

  return { score, reasons, matched };
}

// 質問に合う先輩を、点数の高い順に返す。一致するタグが1つもない人は出さない。
export function recommendSeniors(
  q: QuestionLike,
  candidates: readonly Candidate[],
  opts: Options = {}
): Recommendation[] {
  const { now = new Date(), authorId, limit = 3, requireConsultOk = true } = opts;

  const out: Recommendation[] = [];
  for (const c of candidates) {
    if (c.userId === authorId) continue;
    if (isPaused(c.pausedUntil, now)) continue;
    if (requireConsultOk && !c.consultOk) continue;

    const { score, reasons, matched } = scoreOne(q, c);
    if (matched.length === 0) continue; // 理由のない人はおすすめしない

    out.push({ candidate: c, score, reasons: reasons.slice(0, MAX_REASONS) });
  }

  return out
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.candidate.stats?.helpful ?? 0) - (a.candidate.stats?.helpful ?? 0) ||
        a.candidate.displayName.localeCompare(b.candidate.displayName, "ja")
    )
    .slice(0, limit);
}
