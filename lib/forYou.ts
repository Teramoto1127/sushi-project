import type { SupabaseClient } from "@supabase/supabase-js";
import { isPaused } from "@/lib/daily";

export type ForYouQuestion = { id: string; title: string; tags: string[]; status: string };

export type ForYou = {
  /** プロフィールで選んだ得意なタグ(言語・授業・分野をまとめたもの) */
  tags: string[];
  paused: boolean;
  pausedUntil: string | null;
  /** 得意なタグに合う、まだ解決していない質問(自分の質問と、自分が回答済みのものは除く) */
  questions: ForYouQuestion[];
};

// 先輩向けに「得意分野の質問」を集める。プッシュ通知の代わりに、画面を開いたときに引く。
export async function fetchForYou(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<ForYou> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("languages,courses,topics,paused_until")
    .eq("user_id", userId)
    .maybeSingle();

  const tags = Array.from(
    new Set([...(prof?.languages ?? []), ...(prof?.courses ?? []), ...(prof?.topics ?? [])] as string[])
  );
  const pausedUntil: string | null = prof?.paused_until ?? null;
  const paused = isPaused(pausedUntil);

  if (paused || tags.length === 0) return { tags, paused, pausedUntil, questions: [] };

  const { data: qs } = await supabase
    .from("questions")
    .select("id,title,tags,status")
    .neq("status", "solved")
    .neq("author_id", userId)
    .overlaps("tags", tags)
    .order("created_at", { ascending: false })
    .limit(50);
  const candidates = (qs ?? []) as ForYouQuestion[];
  if (candidates.length === 0) return { tags, paused, pausedUntil, questions: [] };

  // 自分がもう回答した質問は出さない
  const { data: mine } = await supabase
    .from("answers")
    .select("question_id")
    .eq("author_id", userId)
    .in("question_id", candidates.map((q) => q.id));
  const answered = new Set((mine ?? []).map((a) => a.question_id as string));

  // 回答募集中(まだ誰も答えていない)を先に
  const rank = (s: string) => (s === "open" ? 0 : 1);
  const questions = candidates
    .filter((q) => !answered.has(q.id))
    .sort((a, b) => rank(a.status) - rank(b.status))
    .slice(0, limit);

  return { tags, paused, pausedUntil, questions };
}
