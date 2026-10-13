"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { UNIVERSITY_DOMAIN, type AuthState } from "@/lib/auth";
import { HELPFUL_REASON_KEYS } from "@/lib/feedback";
import { PAUSE_DAYS } from "@/lib/daily";

// ---- 新規登録 / ログイン(メールアドレス + パスワード) ----
function authErrorMessage(error: { message: string; status?: number; code?: string }) {
  if (error.status === 429 || error.code?.startsWith("over_")) {
    return "送信回数が多すぎます。しばらく待ってからもう一度お試しください";
  }
  switch (error.code) {
    case "invalid_credentials":
      return "メールアドレスまたはパスワードが違います";
    case "user_already_exists":
      return "このメールアドレスは登録済みです。ログインしてください";
    case "weak_password":
      return "パスワードが弱すぎます。もっと長く、推測されにくいものにしてください";
  }
  // Supabase側のドメイン制限(トリガー)で弾かれた場合
  if (error.message.includes("Database error saving new user")) {
    return `${UNIVERSITY_DOMAIN} のメールアドレスのみ登録できます`;
  }
  return `失敗しました: ${error.message}`;
}

const SignUpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine(
        (v) => v.endsWith(UNIVERSITY_DOMAIN) && v.length > UNIVERSITY_DOMAIN.length,
        `${UNIVERSITY_DOMAIN} のメールアドレスのみ登録できます`
      ),
    password: z
      .string()
      .min(8, "パスワードは8文字以上にしてください")
      .max(72, "パスワードは72文字以内にしてください"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "確認用のパスワードが一致しません",
  });

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: authErrorMessage(error) };

  // メール確認ONの設定で登録済みのアドレスを使うと、identities が空で返る
  if (data.user && data.user.identities?.length === 0) {
    return { error: "このメールアドレスは登録済みです。ログインしてください" };
  }
  // メール確認ONの設定のときはセッションが無い
  if (!data.session) {
    return { message: "確認メールを送りました。メール内のリンクを開いてから、ログインしてください。" };
  }
  redirect("/profile/edit");
}

const SignInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "メールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error) };
  redirect("/questions");
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ---- ログアウト ----
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
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

// ---- 助かった(理由 + 任意の一言) ----
const HelpfulSchema = z.object({
  reasons: z.array(z.string().max(30)).max(4),
  comment: z.string().trim().max(200),
});

export async function markHelpful(
  answerId: string,
  questionId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const parsed = HelpfulSchema.safeParse({
    reasons: formData.getAll("reasons"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) throw new Error("入力内容を確認してください");
  const reasons = parsed.data.reasons.filter((r) => HELPFUL_REASON_KEYS.includes(r));

  // 重複は主キーで弾かれる。2回目以降は通知も送らない
  const { error } = await supabase
    .from("answer_helpful")
    .insert({ answer_id: answerId, user_id: user.id });

  if (!error) {
    const { data: ans } = await supabase
      .from("answers")
      .select("author_id")
      .eq("id", answerId)
      .single();
    if (ans && ans.author_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: ans.author_id,
        actor_id: user.id,
        type: "helpful",
        question_id: questionId,
        answer_id: answerId,
        reasons,
        comment: parsed.data.comment || null,
      });
    }
  }
  revalidatePath(`/questions/${questionId}`);
  revalidatePath("/notifications");
}

// ---- 解決済みにする(質問者のみ。決め手の回答と結果報告つき) ----
const SolveSchema = z.object({
  answer_id: z.union([z.string().uuid(), z.literal("")]),
  note: z.string().trim().max(500),
});

export async function markSolved(questionId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = SolveSchema.safeParse({
    answer_id: formData.get("answer_id") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) throw new Error("入力内容を確認してください");

  // 決め手の回答は、この質問に付いたものだけ有効
  let solvedAnswer: { id: string; author_id: string } | null = null;
  if (parsed.data.answer_id) {
    const { data } = await supabase
      .from("answers")
      .select("id,author_id")
      .eq("id", parsed.data.answer_id)
      .eq("question_id", questionId)
      .is("parent_id", null)
      .single();
    solvedAnswer = data;
  }

  const { data: updated } = await supabase
    .from("questions")
    .update({
      status: "solved",
      solved_answer_id: solvedAnswer?.id ?? null,
      solved_note: parsed.data.note || null,
    })
    .eq("id", questionId)
    .select("id"); // RLSで本人以外は0件になる

  if (updated?.length && solvedAnswer && solvedAnswer.author_id !== user.id) {
    await supabase.from("notifications").insert({
      user_id: solvedAnswer.author_id,
      actor_id: user.id,
      type: "solved",
      question_id: questionId,
      answer_id: solvedAnswer.id,
      comment: parsed.data.note || null,
    });
  }
  revalidatePath(`/questions/${questionId}`);
  revalidatePath("/notifications");
}

// ---- 通知を既読にする ----
export async function markAllRead() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
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

// ---- 休止する / 再開する(先輩が自分のペースを決める) ----
export async function setPause(formData: FormData) {
  const { supabase, user } = await requireUser();
  const v = String(formData.get("days") ?? "");
  const days = Number(v);
  let pausedUntil: string | null = null; // "resume" などは再開
  if ((PAUSE_DAYS as readonly number[]).includes(days)) {
    pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  const { error } = await supabase
    .from("profiles")
    .update({ paused_until: pausedUntil })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/contribution");
  revalidatePath("/questions");
  revalidatePath("/for-you");
  revalidatePath("/members");
}

// ---- 貢献ページの公開設定(本人が決める。初期値は非公開) ----
export async function setContributionPublic(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ contribution_public: formData.get("contribution_public") === "on" })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/contribution");
  revalidatePath(`/u/${user.id}`);
}

// ---- 学びメモ(自分の回答に、自分だけが読めるメモを残す。空で送ると消える) ----
const NoteSchema = z.string().trim().max(200);

export async function saveLearningNote(
  answerId: string,
  questionId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  const parsed = NoteSchema.safeParse(formData.get("note") ?? "");
  if (!parsed.success) throw new Error("メモは200文字までです");

  if (parsed.data === "") {
    await supabase.from("learning_notes").delete().eq("answer_id", answerId).eq("user_id", user.id);
  } else {
    const { error } = await supabase.from("learning_notes").upsert(
      {
        user_id: user.id,
        answer_id: answerId,
        note: parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,answer_id" }
    );
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/questions/${questionId}`);
  revalidatePath("/contribution");
}
