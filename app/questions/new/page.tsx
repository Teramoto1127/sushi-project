import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createQuestion } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { TagLimit } from "@/components/TagLimit";

export const metadata: Metadata = { title: "質問する" };

export default async function NewQuestionPage() {
  const supabase = await createClient();
  const { data: tags } = await supabase.from("tags").select("name,kind").order("kind");

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Link href="/questions" className="text-sm text-muted hover:text-foreground">← 質問一覧に戻る</Link>
      <h1 className="mb-4 mt-2 text-xl font-bold">質問する</h1>
      <form action={createQuestion} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-semibold">タイトル</label>
          <input
            id="title" name="title" required maxLength={100}
            placeholder="例: Pythonでリストの重複を消すには?(100文字まで)"
            className="input"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="body" className="text-sm font-semibold">内容</label>
          <textarea
            id="body" name="body" required maxLength={5000} rows={8}
            placeholder={"状況・試したこと・困っていること\n(エラーメッセージがあればそのまま貼ってください)"}
            className="input"
          />
        </div>
        <TagLimit max={8}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">タグ</legend>
            <div className="flex flex-wrap gap-2">
              {tags?.map((t) => (
                <label key={`${t.kind}-${t.name}`} className="check-chip">
                  <input type="checkbox" name="tags" value={t.name} className="sr-only" /> {t.name}
                </label>
              ))}
            </div>
          </fieldset>
        </TagLimit>
        <SubmitButton pendingText="投稿中…">投稿する</SubmitButton>
      </form>
    </main>
  );
}
