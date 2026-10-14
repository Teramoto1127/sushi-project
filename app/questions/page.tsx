import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { TodayQuestion } from "@/components/TodayQuestion";
import { RESEARCH_MARKER } from "@/lib/research";
import { timeAgo } from "@/lib/timeAgo";

export const metadata: Metadata = { title: "質問一覧" };

type Row = {
  id: string; title: string; tags: string[]; status: string; created_at: string;
  users: { display_name: string; grade: number | null } | null;
  answers: { count: number }[];
};

const SELECT = "id,title,tags,status,created_at,users(display_name,grade),answers(count)";
const who = (r: Row) =>
  `${r.users?.grade ? `${r.users.grade}年 ` : ""}${r.users?.display_name || "名無し"}さん`;

// 質問1件分の行(枠で囲まず、線で区切る)
function QuestionRow({ item }: { item: Row }) {
  return (
    <li className="border-b border-line">
      <Link href={`/questions/${item.id}`} className="row-link">
        <span className="min-w-0 flex-1 space-y-1">
          <span className="row-title block font-bold leading-snug">{item.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
            <StatusBadge status={item.status} />
            <span>{who(item)}</span>
            <span>{timeAgo(item.created_at)}</span>
          </span>
          {item.tags.length > 0 && (
            <span className="block text-[13px] text-muted">{item.tags.map((t) => `#${t}`).join(" ")}</span>
          )}
        </span>
        <span className="min-w-9 flex-none text-center text-xs leading-tight text-muted">
          <span className="block text-xl font-bold text-foreground">{item.answers?.[0]?.count ?? 0}</span>
          回答
        </span>
      </Link>
    </li>
  );
}

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
    .select(SELECT)
    .is("answers.parent_id", null)
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
          .select(SELECT)
          .is("answers.parent_id", null)
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
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold leading-snug">質問一覧</h1>
        <form role="search" className="flex w-full max-w-sm gap-2 md:w-auto md:flex-1 md:justify-end">
          <input type="hidden" name="status" value={activeStatus} />
          {tag && <input type="hidden" name="tag" value={tag} />}
          <label htmlFor="q" className="sr-only">質問を探す</label>
          <input
            id="q" name="q" type="search" defaultValue={q}
            placeholder="キーワードで探す"
            className="input min-w-0 flex-1 md:max-w-xs"
          />
          <button className="btn">探す</button>
        </form>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <section aria-label="質問" className="min-w-0 space-y-4">
          <nav aria-label="状態で絞り込み" className="flex flex-wrap gap-1 border-b border-line">
            {STATUS_TABS.map((t) => (
              <Link
                key={t.value}
                href={tabHref(t.value)}
                aria-current={activeStatus === t.value ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center border-b-[3px] px-3.5 text-[15px] ${
                  activeStatus === t.value
                    ? "border-[var(--accent)] font-bold text-[var(--accent)]"
                    : "border-transparent text-muted hover:text-foreground"
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

          <ul className="border-t border-line">
            {questions.map((item) => <QuestionRow key={item.id} item={item} />)}
          </ul>

          {questions.length === 0 && pinned.length === 0 && (
            <div className="card py-10 text-center text-sm text-muted">
              <p>{filtered ? "条件に合う質問が見つかりませんでした" : "まだ質問がありません"}</p>
              <Link href="/questions/new" className="btn btn-primary mt-4">
                {filtered ? "この内容で質問してみる" : "最初の質問を投稿する"}
              </Link>
            </div>
          )}
        </section>

        <aside aria-label="おすすめ" className="order-first min-w-0 space-y-4 lg:order-none">
          {pinned.length > 0 && (
            <section aria-labelledby="research-heading" className="space-y-3 rounded-[10px] bg-[var(--accent-soft)] p-4 text-[var(--accent-soft-fg)]">
              <h2 id="research-heading" className="flex items-center gap-2 text-sm font-bold">
                <span className="rounded bg-[var(--accent)] px-2 text-xs leading-5 text-white dark:text-[#0b1713]">研究</span>
                フィードバックを募集中
              </h2>
              <ul className="space-y-3">
                {pinned.map((item) => (
                  <li key={item.id} className="space-y-0.5">
                    <Link href={`/questions/${item.id}`} className="block font-bold leading-snug text-foreground hover:underline">
                      {item.title}
                    </Link>
                    <span className="block text-[13px]">
                      {who(item)}・回答 {item.answers?.[0]?.count ?? 0}・{timeAgo(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <TodayQuestion />
        </aside>
      </div>
    </main>
  );
}
