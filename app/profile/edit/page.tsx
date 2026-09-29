import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "@/app/actions";

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
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-3 text-sm">
        {tags?.filter((t) => t.kind === kind).map((t) => (
          <label key={t.name} className="flex items-center gap-1">
            <input type="checkbox" name={field} value={t.name} defaultChecked={prof?.[field]?.includes(t.name)} /> {t.name}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-bold">プロフィール編集</h1>
      <form action={saveProfile} className="space-y-4">
        <input name="display_name" required maxLength={30} defaultValue={me?.display_name} placeholder="表示名" className="w-full rounded border p-2" />
        <div className="flex gap-2">
          <input name="grade" type="number" min={1} max={8} required defaultValue={me?.grade ?? 1} className="w-24 rounded border p-2" />
          <input name="seminar" maxLength={50} defaultValue={me?.seminar ?? ""} placeholder="ゼミ(未所属なら空)" className="flex-1 rounded border p-2" />
        </div>
        {group("language", "languages", "使用言語")}
        {group("course", "courses", "得意な授業 / 今期の講義")}
        {group("topic", "topics", "関心分野・研究テーマ")}
        <input name="bio" maxLength={200} defaultValue={prof?.bio} placeholder="一言(200文字まで)" className="w-full rounded border p-2" />
        <input name="portfolio_url" type="url" defaultValue={prof?.portfolio_url ?? ""} placeholder="ポートフォリオURL(任意)" className="w-full rounded border p-2" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="portfolio_public" defaultChecked={prof?.portfolio_public} /> ポートフォリオを他のメンバーに公開する
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="consult_ok" defaultChecked={prof?.consult_ok} /> 相談を受け付ける
        </label>
        <button className="rounded bg-black px-4 py-2 text-white">保存</button>
      </form>
    </main>
  );
}