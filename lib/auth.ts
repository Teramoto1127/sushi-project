// 新規登録できるメールアドレスのドメイン(サーバー側の制限は supabase/restrict-signup-domain.sql)
export const UNIVERSITY_DOMAIN = "@stu.musashino-u.ac.jp";

export type AuthState = { error?: string; message?: string } | null;
