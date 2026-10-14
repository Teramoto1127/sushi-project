import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markAllRead } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { reasonLabel } from "@/lib/feedback";

export const metadata: Metadata = { title: "通知" };

type Row = {
  id: string; type: "helpful" | "solved" | "answer" | "reply"; question_id: string;
  reasons: string[]; comment: string | null; read_at: string | null;
  questions: { title: string } | null;
  answers: { body: string } | null;
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id,type,question_id,reasons,comment,read_at,questions(title),answers(body)")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as unknown as Row[];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">通知</h1>
        {unread > 0 && (
          <form action={markAllRead}>
            <SubmitButton className="btn text-xs" pendingText="更新中…">すべて既読にする</SubmitButton>
          </form>
        )}
      </div>
      <p className="text-sm text-muted">
        あなたの質問への回答や、あなたの回答へのフィードバックです。
        <Link href="/contribution" className="ml-2 underline">あなたの貢献をまとめて見る →</Link>
      </p>

      <ul className="space-y-3">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={`/questions/${n.question_id}`}
              className={`card block space-y-2 ${n.read_at ? "" : "border-[var(--accent)]"}`}
            >
              <p className="text-sm font-semibold">
                {n.type === "helpful"
                  ? "後輩から「助かった」が届きました"
                  : n.type === "solved"
                    ? "あなたの回答で質問が解決しました"
                    : n.type === "answer"
                      ? "あなたの質問に回答が付きました"
                      : "返信が付きました"}
              </p>
              <p className="text-xs text-muted">質問: {n.questions?.title ?? "(削除された質問)"}</p>
              {n.answers?.body && (
                <p className="line-clamp-2 border-l-2 border-line pl-2 text-xs text-muted">
                  {n.type === "answer" || n.type === "reply" ? "新しい書き込み" : "あなたの回答"}: {n.answers.body}
                </p>
              )}
              {n.reasons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {n.reasons.map((r) => (
                    <span key={r} className="chip">{reasonLabel(r)}</span>
                  ))}
                </div>
              )}
              {n.comment && (
                <p className="whitespace-pre-wrap text-sm">
                  {n.type === "solved" ? "結果報告: " : ""}{n.comment}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <div className="card py-10 text-center text-sm text-muted">まだ通知はありません</div>
      )}
    </main>
  );
}