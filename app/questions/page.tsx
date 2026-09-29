import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string; title: string; tags: string[]; status: string;
  users: { display_name: string } | null;
};

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const { tag, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("questions")
    .select("id,title,tags,status,users(display_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (tag) query = query.contains("tags", [tag]);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);

  const { data } = await query;
  const questions = (data ?? []) as unknown as Row[];

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">知恵袋</h1>
        <div className="space-x-3 text-sm">
          <Link href="/members" className="underline">先輩を探す</Link>
          <Link href="/questions/new" className="rounded bg-black px-3 py-1 text-white">質問する</Link>
        </div>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="タイトルで検索" className="flex-1 rounded border p-2" />
        <button className="rounded border px-3">検索</button>
      </form>
      {tag && <p className="text-sm">タグ: <b>{tag}</b> <Link href="/questions" className="underline">解除</Link></p>}

      <ul className="space-y-3">
        {questions.map((item) => (
          <li key={item.id} className="rounded border p-3">
            <Link href={`/questions/${item.id}`} className="font-semibold underline">{item.title}</Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span>{item.users?.display_name || "名無し"}</span>
              <span className="rounded bg-gray-100 px-2">{item.status}</span>
              {item.tags.map((t) => (
                <Link key={t} href={`/questions?tag=${encodeURIComponent(t)}`} className="rounded bg-blue-50 px-2 text-blue-700">#{t}</Link>
              ))}
            </div>
          </li>
        ))}
        {questions.length === 0 && <p className="text-sm text-gray-500">まだ質問がありません</p>}
      </ul>
    </main>
  );
}