"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ---- 質問投稿 ----
const QuestionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(5000),
  tags: z.array(z.string().max(30)).max(8),
});

export async function createQuestion(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = QuestionSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    tags: formData.getAll("tags"),
  });
  if (!parsed.success) throw new Error("入力内容を確認してください");

  const { data, error } = await supabase
    .from("questions")
    .insert({ ...parsed.data, author_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/questions/${data.id}`);
}

// ---- 回答 / 追質問(parentId があれば追質問) ----
export async function createAnswer(
  questionId: string,
  parentId: string | null,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const body = z.string().trim().min(1).max(5000).safeParse(formData.get("body"));
  if (!body.success) throw new Error("本文は1〜5000文字で入力してください");

  const { error } = await supabase.from("answers").insert({
    question_id: questionId,
    parent_id: parentId,
    body: body.data,
    author_id: user.id,
  });
  if (error) throw new Error(error.message);

  // 最初の回答が付いたら status を answered に(質問者以外の回答のみ)
  if (!parentId) {
    await supabase
      .from("questions")
      .update({ status: "answered" })
      .eq("id", questionId)
      .eq("status", "open")
      .neq("author_id", user.id);
  }
  revalidatePath(`/questions/${questionId}`);
}

// ---- 助かった ----
export async function markHelpful(answerId: string, questionId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("answer_helpful")
    .insert({ answer_id: answerId, user_id: user.id }); // 重複は主キーで弾かれる(無視)
  revalidatePath(`/questions/${questionId}`);
}

// ---- 解決済みにする(質問者のみ。RLSで本人以外は更新不可) ----
export async function markSolved(questionId: string) {
  const { supabase } = await requireUser();
  await supabase.from("questions").update({ status: "solved" }).eq("id", questionId);
  revalidatePath(`/questions/${questionId}`);
}

// ---- プロフィール保存 ----
const ProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(30),
  seminar: z.string().trim().max(50),
  grade: z.coerce.number().int().min(1).max(8),
  bio: z.string().trim().max(200),
  portfolio_url: z.union([z.string().url().max(300), z.literal("")]),
  languages: z.array(z.string().max(30)),
  courses: z.array(z.string().max(30)),
  topics: z.array(z.string().max(30)),
});

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = ProfileSchema.safeParse({
    display_name: formData.get("display_name"),
    seminar: formData.get("seminar") ?? "",
    grade: formData.get("grade"),
    bio: formData.get("bio") ?? "",
    portfolio_url: formData.get("portfolio_url") ?? "",
    languages: formData.getAll("languages"),
    courses: formData.getAll("courses"),
    topics: formData.getAll("topics"),
  });
  if (!parsed.success) throw new Error("入力内容を確認してください");
  const p = parsed.data;

  await supabase
    .from("users")
    .update({ display_name: p.display_name, seminar: p.seminar, grade: p.grade })
    .eq("id", user.id);

  await supabase
    .from("profiles")
    .update({
      bio: p.bio,
      portfolio_url: p.portfolio_url || null,
      portfolio_public: formData.get("portfolio_public") === "on",
      consult_ok: formData.get("consult_ok") === "on",
      languages: p.languages,
      courses: p.courses,
      topics: p.topics,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  revalidatePath("/members");
  redirect("/members");
}