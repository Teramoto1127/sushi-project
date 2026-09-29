import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">先輩を探す</h1>
        <div className="space-x-3 text-sm">
          <Link href="/questions" className="underline">知恵袋</Link>
          <Link href="/profile/edit" className="underline">自分のプロフィール</Link>
        </div>
      </div>

      <form className="flex items-center gap-2 text-sm">
        <input name="tag" defaultValue={tag} placeholder="タグ(例: Python)" className="flex-1 rounded border p-2" />
        <label className="flex items-center gap-1">
          <input type="checkbox" name="ok" value="1" defaultChecked={ok === "1"} /> 相談OKのみ
        </label>
        <button className="rounded border px-3 py-2">絞り込み</button>
      </form>

      <ul className="space-y-3">
        {members.map((m) => (
          <li key={m.user_id} className="rounded border p-3">
            <div className="flex items-center gap-2">
              <b>{m.users!.display_name}</b>
              <span className="text-xs text-gray-600">
                {m.users!.grade}年 {m.users!.seminar && `・${m.users!.seminar}`}
              </span>
              {m.consult_ok && <span className="rounded bg-green-100 px-2 text-xs text-green-700">相談OK</span>}
            </div>
            {m.bio && <p className="mt-1 text-sm">{m.bio}</p>}
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {[...m.languages, ...m.courses, ...m.topics].map((t) => (
                <Link key={t} href={`/members?tag=${encodeURIComponent(t)}`} className="rounded bg-blue-50 px-2 text-blue-700">#{t}</Link>
              ))}
            </div>
            {m.portfolio_public && m.portfolio_url && (
              <a href={m.portfolio_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs underline">
                ポートフォリオ
              </a>
            )}
          </li>
        ))}
        {members.length === 0 && <p className="text-sm text-gray-500">該当するメンバーがいません</p>}
      </ul>
    </main>
  );
}