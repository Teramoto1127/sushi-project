import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/ContactForm";
import { isPaused } from "@/lib/daily";
import { isMailConfigured } from "@/lib/mail";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = { title: "先輩に相談する" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="card space-y-3 text-sm">
      {children}
      <Link href="/members" className="btn text-xs">先輩一覧に戻る</Link>
    </div>
  );
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const questionId = q && UUID.test(q) ? q : null;

  const [{ data: prof }, { data: target }] = await Promise.all([
    UUID.test(id)
      ? supabase.from("profiles").select("consult_ok,paused_until").eq("user_id", id).maybeSingle()
      : { data: null },
    UUID.test(id)
      ? supabase.from("users").select("display_name,grade,seminar").eq("id", id).maybeSingle()
      : { data: null },
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 md:p-6">
      <BackLink href="/members">先輩一覧</BackLink>
      <h1 className="text-xl font-bold">先輩に相談する</h1>

      {!target?.display_name ? (
        <Notice><p>この先輩が見つかりませんでした。</p></Notice>
      ) : id === user.id ? (
        <Notice><p>自分には送れません。</p></Notice>
      ) : !prof?.consult_ok ? (
        <Notice>
          <p>{target.display_name}さんは、いま相談を受け付けていません。</p>
          <p className="text-muted">質問として投稿すると、ほかの先輩にも見てもらえます。</p>
        </Notice>
      ) : isPaused(prof.paused_until) ? (
        <Notice>
          <p>{target.display_name}さんはお休み中です。休み明けにまた送ってください。</p>
        </Notice>
      ) : !isMailConfigured() || !isAdminConfigured() ? (
        <Notice>
          <p>メール送信の設定がまだ終わっていないため、いまは送れません。</p>
          <p className="text-muted">運営に連絡してください。</p>
        </Notice>
      ) : (
        <>
          <p className="text-sm text-muted">
            {target.display_name}さん({target.grade}年{target.seminar ? `・${target.seminar}` : ""})に、メールで相談を送ります。
          </p>
          <ContactForm
            toId={id}
            toName={target.display_name}
            questionId={questionId}
            senderEmail={user.email ?? ""}
          />
        </>
      )}
    </main>
  );
}
