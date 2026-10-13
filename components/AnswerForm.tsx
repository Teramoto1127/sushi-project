"use client";
import { useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { checkDraft, type DraftCheck } from "@/lib/draftCheck";

// 回答フォーム。「分かりやすさチェック」は押したときだけ動く(端末内で完結・保存なし・採点なし)
export function AnswerForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [result, setResult] = useState<(DraftCheck & { tooShort: boolean }) | null>(null);

  function onCheck() {
    const text = ref.current?.value ?? "";
    setResult(
      text.trim().length < 10
        ? { goods: [], tips: [], tooShort: true }
        : { ...checkDraft(text), tooShort: false }
    );
  }

  async function onSubmit(formData: FormData) {
    setResult(null);
    await action(formData);
  }

  const empty = result && result.goods.length === 0 && result.tips.length === 0;

  return (
    <form action={onSubmit} className="space-y-2">
      <label htmlFor="answer-body" className="font-semibold">回答を書く</label>
      <textarea
        ref={ref}
        id="answer-body" name="body" required maxLength={5000} rows={5}
        onChange={() => result && setResult(null)}
        placeholder="分かる範囲で大丈夫です。試した方法や参考になるリンクがあると助かります"
        className="input"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="投稿中…">回答する</SubmitButton>
        <button type="button" onClick={onCheck} className="btn text-sm">
          ✨ 分かりやすさチェック(任意)
        </button>
      </div>

      <div aria-live="polite">
        {result && (
          <div className="space-y-2 rounded-lg border border-line p-3 text-sm">
            {result.tooShort ? (
              <p className="text-muted">もう少し書いてから、チェックしてみてください。</p>
            ) : (
              <>
                {result.goods.length > 0 && (
                  <ul className="space-y-1">
                    {result.goods.map((g) => (
                      <li key={g}>👍 {g}</li>
                    ))}
                  </ul>
                )}
                {result.tips.length > 0 && (
                  <ul className="space-y-1">
                    {result.tips.map((t) => (
                      <li key={t}>💡 {t}</li>
                    ))}
                  </ul>
                )}
                {empty && <p>このまま投稿して大丈夫そうです。</p>}
              </>
            )}
            <p className="text-xs text-muted">
              文字数や書き方から機械的に見ているだけです。内容の正しさは見ていません。投稿内容は保存・送信されません。
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
