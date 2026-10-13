import { createClient } from "@supabase/supabase-js";

// サービスロールキーを使う管理用クライアント。RLSを素通りするので、サーバー側の処理でのみ使う。
//  - 呼び出してよいのは、"use server" のファイル(app/actions.ts)と、サーバーコンポーネントだけ
//  - SUPABASE_SERVICE_ROLE_KEY には NEXT_PUBLIC_ を付けない(ブラウザに出さない)
//  - 取得した値(メールアドレスなど)を、画面や戻り値に載せない
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient はサーバー側でのみ使えます");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// 指定したユーザーのメールアドレス。見つからない・未設定なら null
export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

export const isAdminConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
