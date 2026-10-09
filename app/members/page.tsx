import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "先輩を探す" };

type Row = {
  user_id: string; languages: string[]; courses: string[]; topics: string[];
  bio: string; consult_ok: boolean; portfolio_url: string | null; portfolio_public: boolean;
  users: { display_name: string; seminar: string | null; grade: number | null } | null;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; ok?: string }>;
}) {
  const { tag, ok } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("user_id,languages,courses,topics,bio,consult_ok,portfolio_url,portfolio_public,users(display_name,seminar,grade)");
  if (ok === "1") query = query.eq("consult_ok", true);
  if (tag) {
    const safe = tag.replace(/[^\p{L}\p{N}_+#.\-]/gu, ""); // or() 構文を壊さないため
    query = query.or(`languages.cs.{${safe}},courses.cs.{${safe}},topics.cs.{${safe}}`);
  }
  const { data } = await query.limit(50);
  const members = ((data ?? []) as unknown as Row[]).filter((m) => m.users?.display_name);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">先輩を探す</h1>
        <p className="text-sm text-muted">得意な言語・授業・分野のタグで探せます。「相談OK」の人には気軽に声をかけてみましょう。</p>
      </div>

      <form role="search" className="flex flex-wrap items-center gap-2 text-sm">
        <input
          name="tag" defaultValue={tag}
          placeholder="タグ(例: Python)"
          aria-label="タグで検索"
          className="input min-w-0 flex-1"
        />
        <label className="check-chip">
          <input type="checkbox" name="ok" value="1" defaultChecked={ok === "1"} className="sr-only" />
          相談OKのみ
        </label>
        <button className="btn">絞り込み</button>
      </form>

      {(tag || ok === "1") && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {tag && <span className="chip">#{tag}</span>}
          {ok === "1" && <span className="chip">相談OK</span>}
          <span>{members.length} 人</span>
          <Link href="/members" className="underline">条件をクリア</Link>
        </p>
      )}

      <ul className="space-y-3">
        {members.map((m) => (
          <li key={m.user_id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <b>{m.users!.display_name}</b>
              <span className="text-xs text-muted">
                {m.users!.grade}年{m.users!.seminar ? `・${m.users!.seminar}` : ""}
              </span>
              {m.consult_ok && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  相談OK
                </span>
              )}
            </div>
            {m.bio && <p className="text-sm">{m.bio}</p>}
            <div className="flex flex-wrap gap-2">
              {[...m.languages, ...m.courses, ...m.topics].map((t) => (
                <Link key={t} href={`/members?tag=${encodeURIComponent(t)}`} className="chip">#{t}</Link>
              ))}
            </div>
            {m.portfolio_public && m.portfolio_url && (
              <a href={m.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs underline">
                ポートフォリオ ↗
              </a>
            )}
          </li>
        ))}
      </ul>

      {members.length === 0 && (
        <div className="card py-10 text-center text-sm text-muted">
          <p>該当するメンバーがいません</p>
          <Link href="/members" className="btn mt-4">条件をクリア</Link>
        </div>
      )}
    </main>
  );
}
