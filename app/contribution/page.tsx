import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setContributionPublic, setPause, signOut } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ContributionSummary } from "@/components/ContributionSummary";
import {
  monthKey, monthLabel, monthTrend, parseStats, prevMonthKey, summarizeMonth,
  type MonthSummary, type NotificationLite,
} from "@/lib/contribution";
import { PAUSE_DAYS, isPaused } from "@/lib/daily";

export const metadata: Metadata = { title: "あなたの貢献" };

type NoteRow = {
  note: string; updated_at: string;
  answers: { body: string; question_id: string } | null;
};

function MonthCard({ s, trend }: { s: MonthSummary; trend?: string | null }) {
  const empty = s.helpful + s.solved === 0;
  return (
    <div className="card space-y-2">
      <p className="text-sm font-semibold">{monthLabel(s.key)}</p>
      {empty ? (
        <p className="text-sm text-muted">この月の感謝はありませんでした。</p>
      ) : (
        <>
          <p className="text-sm">
            「助かった」{s.helpful} 件 / 解決の決め手 {s.solved} 件
          </p>
          {trend && <p className="text-xs text-muted">{trend}</p>}
          {s.quotes.length > 0 && (
            <ul className="space-y-1 border-l-2 border-line pl-2">
              {s.quotes.map((q, i) => (
                <li key={i} className="whitespace-pre-wrap text-sm">「{q}」</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default async function ContributionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stats, prof, notif, notes] = await Promise.all([
    supabase.rpc("contribution_stats", { p_user: user.id }),
    supabase.from("profiles").select("paused_until,contribution_public").eq("user_id", user.id).single(),
    supabase
      .from("notifications")
      .select("type,created_at,reasons,comment")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("learning_notes")
      .select("note,updated_at,answers(body,question_id)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const parsed = parseStats(stats.data);
  const rows = (notif.data ?? []) as NotificationLite[];
  const now = new Date();
  const curKey = monthKey(now);
  const cur = summarizeMonth(rows, curKey);
  const prev = summarizeMonth(rows, prevMonthKey(curKey));
  const noteRows = (notes.data ?? []) as unknown as NoteRow[];

  const pausedUntil = prof.data?.paused_until ?? null;
  const paused = isPaused(pausedUntil, now);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">あなたの貢献</h1>
        <p className="text-sm text-muted">
          教えてくれてありがとうございます。あなたの回答が、後輩にどう届いたかをまとめました。
        </p>
        <p className="text-xs">
          <Link href={`/u/${user.id}`} className="underline">公開ページの見え方を確認する ↗</Link>
        </p>
      </div>

      {parsed ? (
        <ContributionSummary stats={parsed} showNextGoal />
      ) : (
        <p className="card text-sm text-muted">
          集計を取得できませんでした。データベースの更新(supabase/migrations)が済んでいるか確認してください。
        </p>
      )}

      <section className="space-y-3" aria-labelledby="month-heading">
        <h2 id="month-heading" className="font-semibold">月ごとのふりかえり</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <MonthCard s={cur} trend={monthTrend(cur, prev)} />
          <MonthCard s={prev} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="font-semibold">教えて学んだことメモ</h2>
        <p className="text-xs text-muted">自分だけに表示されます。回答のカードから書けます。</p>
        {noteRows.length === 0 ? (
          <p className="text-sm text-muted">まだメモはありません。教えて気づいたことを、一言残してみましょう。</p>
        ) : (
          <ul className="space-y-2">
            {noteRows.map((n, i) => (
              <li key={i}>
                {n.answers ? (
                  <Link href={`/questions/${n.answers.question_id}`} className="card block space-y-1">
                    <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                    <p className="line-clamp-1 text-xs text-muted">回答: {n.answers.body}</p>
                  </Link>
                ) : (
                  <p className="card whitespace-pre-wrap text-sm">{n.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="font-semibold">自分のペースで</h2>

        <div className="card space-y-3">
          <p className="text-sm font-semibold">お休みする</p>
          {paused ? (
            <p className="text-sm">
              {new Date(pausedUntil!).toLocaleDateString("ja-JP", { month: "long", day: "numeric", timeZone: "Asia/Tokyo" })}
              まで休止中です。「今日の1問」は出ず、先輩一覧には「休止中」と表示されます。
            </p>
          ) : (
            <p className="text-sm text-muted">
              忙しいときは休んで大丈夫です。休止中は「今日の1問」が出なくなり、先輩一覧にも「休止中」と表示されます。
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {PAUSE_DAYS.map((d) => (
              <form key={d} action={setPause}>
                <input type="hidden" name="days" value={d} />
                <SubmitButton className="btn text-xs" pendingText="更新中…">{d}日休む</SubmitButton>
              </form>
            ))}
            {paused && (
              <form action={setPause}>
                <input type="hidden" name="days" value="resume" />
                <SubmitButton className="btn btn-primary text-xs" pendingText="更新中…">再開する</SubmitButton>
              </form>
            )}
          </div>
        </div>

        <form action={setContributionPublic} className="card space-y-3">
          <p className="text-sm font-semibold">貢献ページの公開</p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox" name="contribution_public" defaultChecked={prof.data?.contribution_public ?? false}
              className="mt-1"
            />
            <span>
              貢献ページを他のメンバーに公開する
              <span className="block text-xs text-muted">
                称号と数だけが見えます。後輩からのコメントや学びメモは公開されません。
              </span>
            </span>
          </label>
          <SubmitButton className="btn text-xs" pendingText="保存中…">保存</SubmitButton>
        </form>
      </section>

      <section className="card space-y-3 text-sm" aria-labelledby="account-heading">
        <h2 id="account-heading" className="font-semibold">アカウント</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile/edit" className="btn">プロフィールを編集</Link>
          <form action={signOut}>
            <button className="btn">ログアウト</button>
          </form>
        </div>
      </section>

      <section className="card space-y-2 text-sm">
        <p className="font-semibold">研究へのご協力</p>
        <p className="text-muted">先輩・後輩のつながりを続けやすくする研究です。参加は自由で、いつでも抜けられます。</p>
        <Link href="/research" className="btn text-xs">内容を見る</Link>
      </section>
    </main>
  );
}
