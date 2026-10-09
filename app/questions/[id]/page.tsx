import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAnswer, markHelpful, markSolved } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";

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
    .select("id,title,body,tags,status,author_id,users(display_name)")
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
        {user?.id === question.author_id && question.status !== "solved" && (
          <form action={markSolved.bind(null, id)}>
            <SubmitButton className="btn" pendingText="更新中…">✓ 解決済みにする</SubmitButton>
          </form>
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
            </p>
            <p className="whitespace-pre-wrap">{a.body}</p>
            <form action={markHelpful.bind(null, a.id, id)}>
              <SubmitButton className="btn text-xs" pendingText="送信中…">
                👍 助かった ({a.answer_helpful[0]?.count ?? 0})
              </SubmitButton>
            </form>

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
