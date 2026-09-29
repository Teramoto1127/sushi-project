"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DOMAIN = "@stu.musashino-u.ac.jp";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.endsWith(DOMAIN)) {
      setMessage(`${DOMAIN} のメールアドレスのみ登録できます`);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setMessage(error ? `送信に失敗しました: ${error.message}` : "ログイン用リンクをメールで送りました");
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-xl font-bold">ログイン</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`xxx${DOMAIN}`}
          className="w-full rounded border p-2"
        />
        <button className="w-full rounded bg-black p-2 text-white">リンクを送る</button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </main>
  );
}