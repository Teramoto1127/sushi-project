import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinResearch, submitCheckin, withdrawResearch } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { CONSENT_POINTS, EASE_LABELS, weekStart } from "@/lib/research";

export const metadata: Metadata = { title: "研究へのご協力" };

export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p } = await supabase
    .from("research_participants")
    .select("withdrawn_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const active = !!p && !p.withdrawn_at;

  const { data: mine } = active
    ? await supabase
        .from("research_checkins")
        .select("skipped,ease,reason,wish")
        .eq("user_id", user.id)
        .eq("week_start", weekStart())
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <Link href="/contribution" className="text-sm text-muted hover:text-foreground">← 貢献に戻る</Link>
      <h1 className="text-xl font-bold">研究へのご協力</h1>

      {!active && (
        <section className="card space-y-4">
          <p className="text-sm">
            先輩・後輩のつながりを続けやすくするための研究に、協力してもらえませんか。
            {p?.withdrawn_at && "(以前に抜けています。もう一度参加することもできます)"}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {CONSENT_POINTS.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <form action={joinResearch} className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>上の内容を読み、協力することに同意します。</span>
            </label>
            <SubmitButton pendingText="登録中…">協力する</SubmitButton>
          </form>
          <p className="text-xs text-muted">協力しなくても、知恵袋の使い方は変わりません。</p>
        </section>
      )}

      {active && (
        <>
          <section className="card space-y-4">
            <h2 className="font-semibold">今週の回答(1分)</h2>
            {mine && (
              <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                {mine.skipped ? "今週は「答えない」で記録しました。" : "今週の回答を受け取りました。ありがとうございます。"}
                下のフォームで、書き直すこともできます。
              </p>
            )}
            <form action={submitCheckin} className="space-y-4">
              <fieldset className="space-y-1 text-sm">
                <legend className="mb-1 font-semibold">今週、後輩とのやり取りは続けやすかったですか?</legend>
                {EASE_LABELS.map((l, i) => (
                  <label key={l} className="flex items-center gap-2">
                    <input type="radio" name="ease" value={i + 1} required defaultChecked={mine?.ease === i + 1} /> {l}
                  </label>
                ))}
              </fieldset>
              <div className="space-y-1">
                <label htmlFor="reason" className="text-sm font-semibold">そう思った理由(任意)</label>
                <textarea id="reason" name="reason" rows={3} maxLength={300} defaultValue={mine?.reason ?? ""} className="input" />
              </div>
              <div className="space-y-1">
                <label htmlFor="wish" className="text-sm font-semibold">あったら続けやすくなると思うこと(任意)</label>
                <textarea id="wish" name="wish" rows={3} maxLength={300} defaultValue={mine?.wish ?? ""} className="input" />
              </div>
              <SubmitButton pendingText="送信中…">回答する</SubmitButton>
            </form>
            <form action={submitCheckin}>
              <input type="hidden" name="skip" value="1" />
              <SubmitButton className="btn text-xs" pendingText="記録中…">今週は答えない</SubmitButton>
            </form>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">協力をやめる</h2>
            <form action={withdrawResearch} className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="delete_data" className="mt-1" />
                <span>これまでの自分の回答も消す</span>
              </label>
              <SubmitButton className="btn text-xs" pendingText="処理中…">協力をやめる</SubmitButton>
            </form>
            <p className="text-xs text-muted">理由は聞きません。やめても、ほかの機能は同じように使えます。</p>
          </section>
        </>
      )}
    </main>
  );
}
