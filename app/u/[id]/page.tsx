import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContributionSummary } from "@/components/ContributionSummary";
import { parseStats } from "@/lib/contribution";

export const metadata: Metadata = { title: "貢献ページ" };

type Row = {
  bio: string; languages: string[]; courses: string[]; topics: string[];
  contribution_public: boolean;
  users: { display_name: string; seminar: string | null; grade: number | null } | null;
};

// 本人が公開にした人の貢献ページ。数・強み・称号だけを見せ、後輩のコメントや学びメモは出さない。
export default async function ContributionPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("bio,languages,courses,topics,contribution_public,users(display_name,seminar,grade)")
    .eq("user_id", id)
    .maybeSingle();
  const prof = data as unknown as Row | null;
  if (!prof?.users?.display_name) notFound();

  const isMe = user?.id === id;
  // 公開していない人の分は、DB側が null を返す(本人は常に見られる)
  const { data: raw } = await supabase.rpc("contribution_stats", { p_user: id });
  const stats = parseStats(raw);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <Link href="/members" className="text-sm text-muted hover:text-foreground">← 先輩一覧に戻る</Link>

      <section className="card space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-xl font-bold">{prof.users.display_name}</h1>
          <span className="text-xs text-muted">
            {prof.users.grade}年{prof.users.seminar ? `・${prof.users.seminar}` : ""}
          </span>
        </div>
        {prof.bio && <p className="text-sm">{prof.bio}</p>}
        <div className="flex flex-wrap gap-2">
          {[...prof.languages, ...prof.courses, ...prof.topics].map((t) => (
            <Link key={t} href={`/members?tag=${encodeURIComponent(t)}`} className="chip">#{t}</Link>
          ))}
        </div>
      </section>

      {stats ? (
        <>
          {isMe && !prof.contribution_public && (
            <p className="card text-sm text-muted">
              これは自分にだけ見えている状態です。他の人に見せたいときは、
              <Link href="/contribution" className="underline">貢献ページ</Link>で公開に切り替えられます。
            </p>
          )}
          <ContributionSummary stats={stats} />
        </>
      ) : (
        <p className="card py-8 text-center text-sm text-muted">この人は、貢献ページを公開していません。</p>
      )}
    </main>
  );
}
