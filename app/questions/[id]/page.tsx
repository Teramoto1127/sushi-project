import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAnswer, markHelpful, markSolved } from "@/app/actions";

type Answer = {
  id: string; parent_id: string | null; body: string; author_id: string;
  users: { display_name: string } | null;
  answer_helpful: { count: number }[];
};

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
    .select("id,parent_id,body,author_id,users(display_name),answer_helpful(count)")
    .eq("question_id", id)
    .order("created_at");
  const answers = (data ?? []) as unknown as Answer[];
  const roots = answers.filter((a) => !a.parent_id);
  const replies = (pid: string) => answers.filter((a) => a.parent_id === pid);
  const authorName = (question.users as unknown as { display_name: string } | null)?.display_name;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <section>
        <h1 className="text-xl font-bold">{question.title}</h1>
        <p className="mt-1 text-xs text-gray-600">
          {authorName || "名無し"} ・ {question.status} ・ {question.tags.map((t: string) => `#${t}`).join(" ")}
        </p>
        <p className="mt-3 whitespace-pre-wrap">{question.body}</p>
        {user?.id === question.author_id && question.status !== "solved" && (
          <form action={markSolved.bind(null, id)} className="mt-3">
            <button className="rounded border px-3 py-1 text-sm">解決済みにする</button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">回答 ({roots.length})</h2>
        {roots.map((a) => (
          <div key={a.id} className="rounded border p-3">
            <p className="text-xs text-gray-600">{a.users?.display_name || "名無し"}</p>
            <p className="whitespace-pre-wrap">{a.body}</p>
            <form action={markHelpful.bind(null, a.id, id)} className="mt-2">
              <button className="rounded border px-2 py-1 text-xs">
                👍 助かった ({a.answer_helpful[0]?.count ?? 0})
              </button>
            </form>

            {/* 追質問スレッド */}
            <div className="mt-3 space-y-2 border-l-2 pl-3">
              {replies(a.id).map((r) => (
                <div key={r.id} className="text-sm">
                  <span className="text-xs text-gray-600">{r.users?.display_name || "名無し"}: </span>
                  <span className="whitespace-pre-wrap">{r.body}</span>
                </div>
              ))}
              <form action={createAnswer.bind(null, id, a.id)} className="flex gap-2">
                <input name="body" required maxLength={5000} placeholder="追質問・返信" className="flex-1 rounded border p-1 text-sm" />
                <button className="rounded border px-2 text-sm">送信</button>
              </form>
            </div>
          </div>
        ))}
      </section>

      <form action={createAnswer.bind(null, id, null)} className="space-y-2">
        <textarea name="body" required maxLength={5000} rows={5} placeholder="回答を書く" className="w-full rounded border p-2" />
        <button className="rounded bg-black px-4 py-2 text-white">回答する</button>
      </form>
    </main>
  );
}