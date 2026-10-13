import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parseStats } from "@/lib/contribution";
import { baseScore, recommendSeniors, type Candidate, type QuestionLike } from "@/lib/recommend";

type Row = {
  user_id: string; languages: string[]; courses: string[]; topics: string[];
  bio: string; consult_ok: boolean; paused_until: string | null;
  users: { display_name: string; seminar: string | null; grade: number | null } | null;
};

const POOL = 200; // 候補として読み込む人数の上限
const WITH_STATS = 6; // 実績まで調べる人数(点数が高い順)

// 質問ページに出す「この質問に合いそうな先輩」。質問した本人にだけ表示する。
export async function RecommendedSeniors({
  question,
  questionId,
  viewerId,
}: {
  question: QuestionLike;
  questionId: string;
  viewerId: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id,languages,courses,topics,bio,consult_ok,paused_until,users(display_name,seminar,grade)")
    .eq("consult_ok", true)
    .neq("user_id", viewerId)
    .limit(POOL);

  const base: Candidate[] = ((data ?? []) as unknown as Row[])
    .filter((r) => r.users?.display_name)
    .map((r) => ({
      userId: r.user_id,
      displayName: r.users!.display_name,
      grade: r.users!.grade,
      seminar: r.users!.seminar,
      bio: r.bio ?? "",
      languages: r.languages ?? [],
      courses: r.courses ?? [],
      topics: r.topics ?? [],
      consultOk: r.consult_ok,
      pausedUntil: r.paused_until,
      stats: null,
    }));

  // 一致のある人だけを点数順に絞り、その人たちの公開された実績を取りに行く
  const shortlist = base
    .map((c) => ({ c, s: baseScore(question, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, WITH_STATS)
    .map((x) => x.c);
  if (shortlist.length === 0) return null;

  // 公開していない人の分は、DB側が null を返す
  const withStats: Candidate[] = await Promise.all(
    shortlist.map(async (c) => {
      const { data: raw } = await supabase.rpc("contribution_stats", { p_user: c.userId });
      return { ...c, stats: parseStats(raw) };
    })
  );

  const recs = recommendSeniors(question, withStats, { authorId: viewerId, limit: 3 });
  if (recs.length === 0) return null;

  return (
    <section className="card space-y-3" aria-labelledby="recommend-heading">
      <div>
        <h2 id="recommend-heading" className="text-sm font-semibold">🤝 この質問に合いそうな先輩</h2>
        <p className="text-xs text-muted">
          タグと、公開されている実績から自動で選んでいます。回答を待つ間に、相談してみるのも一つの方法です。
        </p>
      </div>
      <ul className="space-y-3">
        {recs.map(({ candidate: c, reasons }) => (
          <li key={c.userId} className="space-y-2 rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <b>{c.displayName}</b>
              <span className="text-xs text-muted">
                {c.grade}年{c.seminar ? `・${c.seminar}` : ""}
              </span>
            </div>
            <ul className="list-inside list-disc text-sm">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href={`/contact/${c.userId}?q=${questionId}`} className="btn btn-primary text-xs">
                ✉ 相談を送る
              </Link>
              <Link href={`/u/${c.userId}`} className="btn text-xs">貢献を見る</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
