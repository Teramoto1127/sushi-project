import { createClient } from "@/lib/supabase/server";
import { createQuestion } from "@/app/actions";

export default async function NewQuestionPage() {
  const supabase = await createClient();
  const { data: tags } = await supabase.from("tags").select("name,kind").order("kind");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-bold">質問する</h1>
      <form action={createQuestion} className="space-y-4">
        <input name="title" required maxLength={100} placeholder="タイトル(100文字まで)" className="w-full rounded border p-2" />
        <textarea name="body" required maxLength={5000} rows={8} placeholder="状況・試したこと・困っていること" className="w-full rounded border p-2" />
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">タグ(最大8つ)</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {tags?.map((t) => (
              <label key={`${t.kind}-${t.name}`} className="flex items-center gap-1">
                <input type="checkbox" name="tags" value={t.name} /> {t.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="rounded bg-black px-4 py-2 text-white">投稿</button>
      </form>
    </main>
  );
}