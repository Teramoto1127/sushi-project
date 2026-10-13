import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAnswer, markHelpful, markSolved, saveLearningNote } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";
import { HELPFUL_REASONS } from "@/lib/feedback";

type Answer = {
  id: string; parent_id: string | null; body: string; author_id: string;
  users: { display_name: string } | null;
  answer_helpful: { count: number }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("questions").select("title").eq("id", id).single();
  return { title: data?.title ?? "質問" };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: question } = await supabase
    .from("questions")
    .select("id,title,body,tags,status,author_id,solved_answer_id,solved_note,users(display_name)")
    .eq("id", id)
    .single();
  if (!question) notFound();

  const { data } = await supabase
    .from("answers")
    .select("id,parent_id,body,author_id,users!answers_author_id_fkey(display_name),answer_helpful(count)")
    .eq("question_id", id)
    .order("created_at");

  const answers = (data ?? []) as unknown as Answer[];
  const roots = answers.filter((a) => !a.parent_id);
  const replies = (pid: string) => answers.filter((a) => a.parent_id === pid);
  const authorName = (question.users as unknown as { display_name: string } | null)?.display_name;

  // 自分の回答につけた学びメモ(自分だけが読める)
  const myAnswerIds = roots.filter((a) => a.author_id === user?.id).map((a) => a.id);
  const { data: noteRows } =
    user && myAnswerIds.length > 0
      ? await supabase
          .from("learning_notes")
          .select("answer_id,note")
          .eq("user_id", user.id)
          .in("answer_id", myAnswerIds)
      : { data: [] as { answer_id: string; note: string }[] };
  const noteOf = new Map((noteRows ?? []).map((n) => [n.answer_id, n.note]));

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <Link href="/questions" className="text-sm text-muted hover:text-foreground">← 質問一覧に戻る</Link>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <StatusBadge status={question.status} />
          <span>{authorName || "名無し"}</span>
        </div>
        <h1 className="text-xl font-bold">{question.title}</h1>
        <p className="whitespace-pre-wrap">{question.body}</p>
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {question.tags.map((t: string) => (
              <Link key={t} href={`/questions?tag=${encodeURIComponent(t)}`} className="chip">#{t}</Link>
            ))}
          </div>
        )}

        {question.solved_note && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <p className="mb-1 text-xs font-semibold">✓ 解決報告</p>
            <p className="whitespace-pre-wrap">{question.solved_note}</p>
          </div>
        )}

        {user?.id === question.author_id && question.status !== "solved" && (
          <details className="rounded-lg border border-line p-3">
            <summary className="btn cursor-pointer">✓ 解決済みにする</summary>
            <form action={markSolved.bind(null, id)} className="mt-3 space-y-3">
              <fieldset className="space-y-1 text-sm">
                <legend className="mb-1 font-semibold">どの回答で解決しましたか?</legend>
                {roots.map((a) => (
                  <label key={a.id} className="flex items-start gap-2">
                    <input type="radio" name="answer_id" value={a.id} className="mt-1" />
                    <span>
                      <span className="text-xs text-muted">{a.users?.display_name || "名無し"}: </span>
                      {a.body.length > 40 ? `${a.body.slice(0, 40)}…` : a.body}
                    </span>
                  </label>
                ))}
                <label className="flex items-center gap-2">
                  <input type="radio" name="answer_id" value="" defaultChecked /> 特定の回答ではない / 自分で解決した
                </label>
              </fieldset>
              <div className="space-y-1">
                <label htmlFor="solved-note" className="text-sm font-semibold">結果はどうなりましたか?(任意)</label>
                <textarea
                  id="solved-note" name="note" maxLength={500} rows={3}
                  placeholder="例: 教わった方法で動きました!テストも通りました"
                  className="input"
                />
              </div>
              <SubmitButton className="btn btn-primary" pendingText="更新中…">解決済みにする</SubmitButton>
            </form>
          </details>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="answers-heading">
        <h2 id="answers-heading" className="font-semibold">回答 ({roots.length})</h2>
        {roots.length === 0 && (
          <p className="card text-sm text-muted">まだ回答がありません。最初の回答を書いてみましょう。</p>
        )}
        {roots.map((a) => (
          <article key={a.id} className="card space-y-3">
            <p className="text-xs text-muted">
              {a.users?.display_name || "名無し"}
              {a.author_id === question.author_id && <span className="chip ml-2">質問者</span>}
              {a.id === question.solved_answer_id && <span className="chip ml-2">✓ 解決の決め手</span>}
            </p>
            <p className="whitespace-pre-wrap">{a.body}</p>

            <details>
              <summary className="btn cursor-pointer text-xs">
                👍 助かった ({a.answer_helpful[0]?.count ?? 0})
              </summary>
              <form action={markHelpful.bind(null, a.id, id)} className="mt-2 space-y-2">
                <fieldset>
                  <legend className="mb-1 text-xs text-muted">どこが良かった?(複数選べます)</legend>
                  <div className="flex flex-wrap gap-2">
                    {HELPFUL_REASONS.map((r) => (
                      <label key={r.key} className="check-chip">
                        <input type="checkbox" name="reasons" value={r.key} className="sr-only" /> {r.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <input
                  name="comment" maxLength={200}
                  placeholder="一言あれば(任意)"
                  aria-label="一言コメント(任意)"
                  className="input text-sm"
                />
                <SubmitButton className="btn btn-primary text-xs" pendingText="送信中…">送る</SubmitButton>
              </form>
            </details>

            {user?.id === a.author_id && (
              <details className="rounded-lg border border-line p-2">
                <summary className="btn cursor-pointer text-xs">
                  📝 教えて学んだことをメモ{noteOf.has(a.id) ? "(記入済み)" : ""}
                </summary>
                <form action={saveLearningNote.bind(null, a.id, id)} className="mt-2 space-y-2">
                  <label htmlFor={`note-${a.id}`} className="text-xs text-muted">
                    この回答で気づいたこと・復習になったこと(自分だけに表示・200文字まで)
                  </label>
                  <textarea
                    id={`note-${a.id}`} name="note" maxLength={200} rows={2}
                    defaultValue={noteOf.get(a.id) ?? ""}
                    placeholder="例: 説明してみて、リストの参照渡しを理解し直せた"
                    className="input text-sm"
                  />
                  <SubmitButton className="btn btn-primary text-xs" pendingText="保存中…">保存</SubmitButton>
                </form>
              </details>
            )}

            {/* 追質問スレッド */}
            <div className="space-y-2 border-l-2 border-line pl-3">
              {replies(a.id).map((r) => (
                <div key={r.id} className="text-sm">
                  <span className="text-xs text-muted">{r.users?.display_name || "名無し"}: </span>
                  <span className="whitespace-pre-wrap">{r.body}</span>
                </div>
              ))}
              <form action={createAnswer.bind(null, id, a.id)} className="flex gap-2">
                <input
                  name="body" required maxLength={5000}
                  placeholder="追質問・返信"
                  aria-label="追質問・返信"
                  className="input flex-1 text-sm"
                />
                <SubmitButton className="btn" pendingText="送信中…">送信</SubmitButton>
              </form>
            </div>
          </article>
        ))}
      </section>

      <form action={createAnswer.bind(null, id, null)} className="space-y-2">
        <label htmlFor="answer-body" className="font-semibold">回答を書く</label>
        <textarea
          id="answer-body" name="body" required maxLength={5000} rows={5}
          placeholder="分かる範囲で大丈夫です。試した方法や参考になるリンクがあると助かります"
          className="input"
        />
        <SubmitButton pendingText="投稿中…">回答する</SubmitButton>
      </form>
    </main>
  );
}