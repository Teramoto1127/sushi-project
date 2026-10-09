import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "プロフィール編集" };

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: me }, { data: prof }, { data: tags }] = await Promise.all([
    supabase.from("users").select("display_name,seminar,grade").eq("id", user.id).single(),
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("tags").select("name,kind"),
  ]);

  const group = (kind: string, field: "languages" | "courses" | "topics", label: string) => (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {tags?.filter((t) => t.kind === kind).map((t) => (
          <label key={t.name} className="check-chip">
            <input type="checkbox" name={field} value={t.name} defaultChecked={prof?.[field]?.includes(t.name)} className="sr-only" /> {t.name}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <h1 className="mb-1 text-xl font-bold">プロフィール編集</h1>
      <p className="mb-4 text-sm text-muted">「先輩を探す」に表示される内容です。</p>
      <form action={saveProfile} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="display_name" className="text-sm font-semibold">表示名</label>
          <input id="display_name" name="display_name" required maxLength={30} defaultValue={me?.display_name} placeholder="例: むさし太郎" className="input" />
        </div>
        <div className="flex gap-3">
          <div className="w-24 space-y-1">
            <label htmlFor="grade" className="text-sm font-semibold">学年</label>
            <input id="grade" name="grade" type="number" min={1} max={8} required defaultValue={me?.grade ?? 1} className="input" />
          </div>
          <div className="flex-1 space-y-1">
            <label htmlFor="seminar" className="text-sm font-semibold">ゼミ</label>
            <input id="seminar" name="seminar" maxLength={50} defaultValue={me?.seminar ?? ""} placeholder="未所属なら空のまま" className="input" />
          </div>
        </div>
        {group("language", "languages", "使用言語")}
        {group("course", "courses", "得意な授業 / 今期の講義")}
        {group("topic", "topics", "関心分野・研究テーマ")}
        <div className="space-y-1">
          <label htmlFor="bio" className="text-sm font-semibold">一言(200文字まで)</label>
          <input id="bio" name="bio" maxLength={200} defaultValue={prof?.bio} placeholder="例: 機械学習の授業なら教えられます" className="input" />
        </div>
        <div className="space-y-1">
          <label htmlFor="portfolio_url" className="text-sm font-semibold">ポートフォリオURL(任意)</label>
          <input id="portfolio_url" name="portfolio_url" type="url" defaultValue={prof?.portfolio_url ?? ""} placeholder="https://" className="input" />
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="portfolio_public" defaultChecked={prof?.portfolio_public} /> ポートフォリオを他のメンバーに公開する
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="consult_ok" defaultChecked={prof?.consult_ok} /> 相談を受け付ける
          </label>
        </div>
        <SubmitButton pendingText="保存中…">保存する</SubmitButton>
      </form>
    </main>
  );
}
