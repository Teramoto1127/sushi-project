"use client";
import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions";
import { UNIVERSITY_DOMAIN } from "@/lib/auth";
import { SubmitButton } from "./SubmitButton";

type Mode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction] = useActionState(signIn, null);
  const [signUpState, signUpAction] = useActionState(signUp, null);

  const state = mode === "signin" ? signInState : signUpState;
  const isSignUp = mode === "signup";

  return (
    <div className="card space-y-4">
      <div role="tablist" aria-label="ログインと新規登録" className="grid grid-cols-2 gap-1 rounded-lg bg-line p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md py-1.5 font-semibold ${
              mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {m === "signin" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">
        {isSignUp
          ? `新規登録は大学のメールアドレス(${UNIVERSITY_DOMAIN})のみ利用できます。`
          : "登録したメールアドレスとパスワードでログインします。"}
      </p>

      {/* key でモードごとにフォームを作り直し、入力内容を持ち越さない */}
      <form key={mode} action={isSignUp ? signUpAction : signInAction} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-semibold">メールアドレス</label>
          <input
            id="email" name="email" type="email" required
            autoComplete="email" inputMode="email"
            placeholder={`xxx${UNIVERSITY_DOMAIN}`}
            className="input"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-semibold">
            パスワード{isSignUp && <span className="font-normal text-muted">(8文字以上)</span>}
          </label>
          <input
            id="password" name="password" type="password" required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="input"
          />
        </div>
        {isSignUp && (
          <div className="space-y-1">
            <label htmlFor="confirm" className="text-sm font-semibold">パスワード(確認)</label>
            <input
              id="confirm" name="confirm" type="password" required minLength={8}
              autoComplete="new-password"
              className="input"
            />
          </div>
        )}
        <SubmitButton className="btn btn-primary w-full" pendingText={isSignUp ? "登録中…" : "ログイン中…"}>
          {isSignUp ? "新規登録する" : "ログイン"}
        </SubmitButton>
      </form>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {state.message}
        </p>
      )}
    </div>
  );
}