import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setPause } from "@/app/actions";
import { fetchForYou } from "@/lib/forYou";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata: Metadata = { title: "得意分野の質問" };

export default async function ForYouPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fy = await fetchForYou(supabase, user.id);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">得意分野の質問</h1>
        <p className="text-sm text-muted">
          プロフィールの得意なタグに合う、まだ解決していない質問です。見られるときに、答えられそうなものだけで大丈夫です。
        </p>
      </div>

      {fy.paused ? (
        <div className="card space-y-3 text-sm">
          <p>🌙 お休み中です。休み明けに、また覗いてください。</p>
          <form action={setPause}>
            <input type="hidden" name="days" value="resume" />
            <SubmitButton className="btn btn-primary text-xs" pendingText="更新中…">再開する</SubmitButton>
          </form>
        </div>
      ) : fy.tags.length === 0 ? (
        <div className="card space-y-3 text-sm">
          <p>得意なタグが未設定です。選ぶと、ここに合う質問が並びます。</p>
          <Link href="/profile/edit" className="btn">プロフィールを編集</Link>
        </div>
      ) : fy.questions.length === 0 ? (
        <div className="card py-10 text-center text-sm text-muted">
          いま、得意分野に合う質問はありません。
          <Link href="/questions" className="mt-4 block underline">質問一覧を見る</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {fy.questions.map((q) => (
            <li key={q.id}>
              <Link href={`/questions/${q.id}`} className="card block space-y-2">
                <p className="font-medium">{q.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={q.status} />
                  {q.tags.map((t) => (
                    <span key={t} className={fy.tags.includes(t) ? "chip" : "text-xs text-muted"}>#{t}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
