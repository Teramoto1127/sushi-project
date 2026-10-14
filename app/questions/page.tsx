import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { TodayQuestion } from "@/components/TodayQuestion";
import { RESEARCH_MARKER } from "@/lib/research";

export const metadata: Metadata = { title: "質問一覧" };

type Row = {
  id: string; title: string; tags: string[]; status: string;
  users: { display_name: string } | null;
};

const STATUS_TABS = [
  { value: "", label: "すべて" },
  { value: "open", label: "回答募集中" },
  { value: "answered", label: "回答あり" },
  { value: "solved", label: "解決済み" },
];

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; status?: string }>;
}) {
  const { tag, q, status } = await searchParams;
  const activeStatus = STATUS_TABS.some((t) => t.value === status) ? (status ?? "") : "";
  const supabase = await createClient();

  let query = supabase
    .from("questions")
    .select("id,title,tags,status,users(display_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (tag) query = query.contains("tags", [tag]);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  if (activeStatus) query = query.eq("status", activeStatus);

  const filtered = Boolean(tag || q || activeStatus);

  // 研究のフィードバックを募る質問は、絞り込みがないときだけ、一覧の上に出す(解決済みは出さない)
  const [{ data }, { data: pinnedData }] = await Promise.all([
    query,
    filtered
      ? Promise.resolve({ data: [] })
      : supabase
          .from("questions")
          .select("id,title,tags,status,users(display_name)")
          .ilike("body", `%${RESEARCH_MARKER}%`)
          .neq("status", "solved")
          .order("created_at", { ascending: false })
          .limit(5),
  ]);
  const pinned = (pinnedData ?? []) as unknown as Row[];
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const questions = ((data ?? []) as unknown as Row[]).filter((r) => !pinnedIds.has(r.id));

  const tabHref = (value: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (tag) p.set("tag", tag);
    if (value) p.set("status", value);
    const s = p.toString();
    return s ? `/questions?${s}` : "/questions";
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">質問一覧</h1>
        <Link href="/questions/new" className="btn btn-primary">＋ 質問する</Link>
      </div>

      <TodayQuestion />

      <form role="search" className="flex gap-2">
        <input type="hidden" name="status" value={activeStatus} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="タイトルで検索"
          aria-label="質問をタイトルで検索"
          className="input flex-1"
        />
        <button className="btn">検索</button>
      </form>

      <nav aria-label="状態で絞り込み" className="flex flex-wrap gap-2 text-sm">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={tabHref(t.value)}
            aria-current={activeStatus === t.value ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${
              activeStatus === t.value
                ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-soft-fg)]"
                : "border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {(tag || q) && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {tag && <span className="chip">#{tag}</span>}
          {q && <span>「{q}」</span>}
          <span>の検索結果 {questions.length} 件</span>
          <Link href="/questions" className="underline">条件をクリア</Link>
        </p>
      )}

      {pinned.length > 0 && (
        <section aria-labelledby="research-heading" className="space-y-2">
          <h2 id="research-heading" className="text-sm font-semibold">🔬 研究へのフィードバックを募集中</h2>
          <ul className="space-y-3">
            {pinned.map((item) => (
              <li key={item.id}>
                <Link href={`/questions/${item.id}`} className="card block border-[var(--accent)]">
                  <span className="font-semibold">{item.title}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusBadge status={item.status} />
                    <span>{item.users?.display_name || "名無し"}</span>
                    {item.tags.map((t) => (
                      <span key={t} className="chip">#{t}</span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-3">
        {questions.map((item) => (
          <li key={item.id}>
            <Link href={`/questions/${item.id}`} className="card block">
              <span className="font-semibold">{item.title}</span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusBadge status={item.status} />
                <span>{item.users?.display_name || "名無し"}</span>
                {item.tags.map((t) => (
                  <span key={t} className="chip">#{t}</span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {questions.length === 0 && pinned.length === 0 && (
        <div className="card py-10 text-center text-sm text-muted">
          <p>{filtered ? "条件に合う質問が見つかりませんでした" : "まだ質問がありません"}</p>
          <Link href="/questions/new" className="btn btn-primary mt-4">
            {filtered ? "この内容で質問してみる" : "最初の質問を投稿する"}
          </Link>
        </div>
      )}
    </main>
  );
}