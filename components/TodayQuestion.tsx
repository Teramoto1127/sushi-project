import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/contribution";
import { pickDaily } from "@/lib/daily";
import { fetchForYou } from "@/lib/forYou";
import { StatusBadge } from "@/components/StatusBadge";

// 質問一覧の上に出す「今日の1問」。得意なタグに合う質問を、同じ人には同じ日のあいだ同じものを出す。
export async function TodayQuestion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const fy = await fetchForYou(supabase, user.id);

  if (fy.paused) {
    return (
      <p className="card text-sm text-muted">
        お休み中です。いつでも戻れます。
        <Link href="/contribution" className="ml-2 underline">再開・設定</Link>
      </p>
    );
  }

  if (fy.tags.length === 0) {
    return (
      <p className="card text-sm text-muted">
        プロフィールで得意なタグを選ぶと、ここに「今日の1問」が出ます。
        <Link href="/profile/edit" className="ml-2 underline">プロフィールを編集</Link>
      </p>
    );
  }

  const pick = pickDaily(fy.questions, `${user.id}:${dayKey(new Date())}`);
  if (!pick) return null; // 該当する質問がなければ何も出さない

  return (
    <section className="card space-y-2" aria-labelledby="today-heading">
      <h2 id="today-heading" className="text-sm font-bold text-muted">今日、答えられそうな質問</h2>
      <Link href={`/questions/${pick.id}`} className="block space-y-1 hover:text-[var(--accent)]">
        <p className="font-bold leading-snug">{pick.title}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
          <StatusBadge status={pick.status} />
          <span>{pick.tags.map((t) => `#${t}`).join(" ")}</span>
        </p>
      </Link>
      <Link href="/for-you" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--accent)] underline">
        得意分野の質問をもっと見る
      </Link>
    </section>
  );
}
