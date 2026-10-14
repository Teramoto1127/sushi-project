"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { sendContactRequest } from "@/app/actions";
import { CONTACT_CATEGORIES, MESSAGE_MAX, MESSAGE_MIN, type ContactCategoryId } from "@/lib/contact";
import { SubmitButton } from "@/components/SubmitButton";

export function ContactForm({
  toId,
  toName,
  questionId,
  senderEmail,
}: {
  toId: string;
  toName: string;
  questionId: string | null;
  senderEmail: string;
}) {
  const [state, action] = useActionState(sendContactRequest, null);
  const [category, setCategory] = useState<ContactCategoryId>(questionId ? "question" : "other");
  const ref = useRef<HTMLTextAreaElement>(null);
  const current = CONTACT_CATEGORIES.find((c) => c.id === category)!;

  if (state?.message) {
    return (
      <div className="card space-y-3 text-sm" role="status">
        <p className="font-semibold">送信しました</p>
        <p>{state.message}</p>
        <p className="text-xs text-muted">返信が来ないときも、急かさずに待ちましょう。質問として投稿しておくと、ほかの先輩にも見てもらえます。</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/members" className="btn text-xs">先輩一覧へ</Link>
          <Link href="/questions" className="btn text-xs">質問一覧へ</Link>
        </div>
      </div>
    );
  }

  function fillStarter() {
    const el = ref.current;
    if (!el || el.value.trim() !== "") return;
    el.value = current.placeholder;
    el.focus();
  }

  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="to" value={toId} />
      <input type="hidden" name="question" value={questionId ?? ""} />

      <div className="space-y-1">
        <label htmlFor="category" className="text-sm font-semibold">相談の種類</label>
        <select
          id="category" name="category" value={category}
          onChange={(e) => setCategory(e.target.value as ContactCategoryId)}
          className="input"
        >
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="message" className="text-sm font-semibold">
            {toName}さんへのメッセージ
            <span className="ml-1 font-normal text-muted">({MESSAGE_MIN}〜{MESSAGE_MAX}文字)</span>
          </label>
          <button type="button" onClick={fillStarter} className="text-xs underline">書き出し例を入れる</button>
        </div>
        <textarea
          id="message" name="message" ref={ref} required rows={7}
          minLength={MESSAGE_MIN} maxLength={MESSAGE_MAX}
          placeholder={`${current.placeholder}\n\n聞きたいこと・困っていること・いつまでに知りたいか`}
          className="input"
        />
        <p className="text-xs text-muted">
          先輩は無料で教えてくれています。分かる範囲の状況と、聞きたいことを具体的に書くと、返信しやすくなります。
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          返信のため、私のメールアドレス(<b>{senderEmail}</b>)が{toName}さんに伝わることに同意します。
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </p>
      )}

      <SubmitButton pendingText="送信中…">メールで送る</SubmitButton>
      <p className="text-xs text-muted">
        {toName}さんのメールアドレスは表示されません。返信するかどうかは先輩が決めます。1日に送れるのは3件までです。
      </p>
    </form>
  );
}
