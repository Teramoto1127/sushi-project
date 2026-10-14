import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContributionSummary } from "@/components/ContributionSummary";
import { parseStats } from "@/lib/contribution";
import { isPaused } from "@/lib/daily";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = { title: "貢献ページ" };

type Row = {
  bio: string; languages: string[]; courses: string[]; topics: string[];
  contribution_public: boolean; consult_ok: boolean; paused_until: string | null;
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
    .select("bio,languages,courses,topics,contribution_public,consult_ok,paused_until,users(display_name,seminar,grade)")
    .eq("user_id", id)
    .maybeSingle();
  const prof = data as unknown as Row | null;
  if (!prof?.users?.display_name) notFound();

  const isMe = user?.id === id;
  // 公開していない人の分は、DB側が null を返す(本人は常に見られる)
  const { data: raw } = await supabase.rpc("contribution_stats", { p_user: id });
  const stats = parseStats(raw);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <BackLink href="/members">先輩一覧</BackLink>

      <section className="card space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-xl font-bold">{prof.users.display_name}</h1>
          <span className="text-xs text-muted">
            {prof.users.grade}年{prof.users.seminar ? `・${prof.users.seminar}` : ""}
          </span>
        </div>
        {prof.bio && <p className="text-sm">{prof.bio}</p>}
        {!isMe && prof.consult_ok && !isPaused(prof.paused_until) && (
          <Link href={`/contact/${id}`} className="btn btn-primary text-xs">メールで相談</Link>
        )}
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
