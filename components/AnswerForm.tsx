"use client";
import { useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { checkDraft, type DraftCheck } from "@/lib/draftCheck";
import { BrowserAiError, isBrowserAiUsable, reviewDraftWithBrowserAi } from "@/lib/browserAi";

type RuleResult = DraftCheck & { tooShort: boolean };
type AiState =
  | { kind: "idle" }
  | { kind: "running"; progress: number | null }
  | { kind: "done"; text: string }
  | { kind: "error"; message: string };

// 回答フォーム。2つのチェックはどちらも押したときだけ動き、端末内で完結する(保存・送信なし、採点なし)。
//  - 分かりやすさチェック: ルールベース。どの環境でも使える
//  - AIでも見る: Chrome 内蔵AI。使えない環境ではボタン自体を出さない
export function AnswerForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const runId = useRef(0); // 実行中に下書きが変わったら、古いAI結果を捨てるための印
  const [result, setResult] = useState<RuleResult | null>(null);
  const [aiUsable, setAiUsable] = useState(false);
  const [ai, setAi] = useState<AiState>({ kind: "idle" });

  useEffect(() => {
    let alive = true;
    isBrowserAiUsable().then((ok) => alive && setAiUsable(ok));
    return () => {
      alive = false;
    };
  }, []);

  function clearResults() {
    runId.current++;
    setResult(null);
    setAi({ kind: "idle" });
  }

  function onCheck() {
    const text = ref.current?.value ?? "";
    setResult(
      text.trim().length < 10
        ? { goods: [], tips: [], tooShort: true }
        : { ...checkDraft(text), tooShort: false }
    );
  }

  async function onAiCheck() {
    const text = (ref.current?.value ?? "").trim();
    if (text.length < 10) {
      setResult({ goods: [], tips: [], tooShort: true });
      return;
    }
    const id = ++runId.current;
    setAi({ kind: "running", progress: null });
    try {
      const out = await reviewDraftWithBrowserAi(text, (ratio) => {
        if (runId.current === id) setAi({ kind: "running", progress: ratio });
      });
      if (runId.current === id) setAi({ kind: "done", text: out });
    } catch (e) {
      if (runId.current !== id) return;
      setAi({
        kind: "error",
        message: e instanceof BrowserAiError ? e.message : "AIチェックに失敗しました",
      });
    }
  }

  async function onSubmit(formData: FormData) {
    clearResults();
    await action(formData);
  }

  const empty = result && result.goods.length === 0 && result.tips.length === 0;
  const running = ai.kind === "running";

  return (
    <form action={onSubmit} className="space-y-2 border-t border-line pt-5">
      <label htmlFor="answer-body" className="font-semibold">回答を書く</label>
      <textarea
        ref={ref}
        id="answer-body" name="body" required maxLength={5000} rows={5}
        onChange={() => (result || ai.kind !== "idle") && clearResults()}
        placeholder="分かる範囲で大丈夫です。試した方法や参考になるリンクがあると助かります"
        className="input"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="投稿中…">回答する</SubmitButton>
        <button type="button" onClick={onCheck} className="btn text-sm">
          書き方をチェック(任意)
        </button>
        {aiUsable && (
          <button type="button" onClick={onAiCheck} disabled={running} className="btn text-sm">
            {running ? "AIが確認中…" : "AIでも見る(任意)"}
          </button>
        )}
      </div>

      <div aria-live="polite" className="space-y-2">
        {result && (
          <div className="space-y-2 rounded-lg border border-line p-3 text-sm">
            {result.tooShort ? (
              <p className="text-muted">もう少し書いてから、チェックしてみてください。</p>
            ) : (
              <>
                {result.goods.length > 0 && (
                  <ul className="space-y-1">
                    {result.goods.map((g) => (
                      <li key={g}><b>良い点: </b>{g}</li>
                    ))}
                  </ul>
                )}
                {result.tips.length > 0 && (
                  <ul className="space-y-1">
                    {result.tips.map((t) => (
                      <li key={t}><b>提案: </b>{t}</li>
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

        {ai.kind === "running" && (
          <p className="rounded-lg border border-line p-3 text-sm text-muted">
            {ai.progress === null
              ? "AIを準備しています…"
              : ai.progress < 1
                ? `AIモデルを読み込み中です(初回のみ) ${Math.round(ai.progress * 100)}%`
                : "AIが確認しています…"}
          </p>
        )}
        {ai.kind === "done" && (
          <div className="space-y-2 rounded-lg border border-line p-3 text-sm">
            <p className="whitespace-pre-wrap">{ai.text}</p>
            <p className="text-xs text-muted">
              お使いのブラウザ内のAIによる提案です。見当違いのこともあるので、参考程度にしてください。下書きは端末の外に出ません。
            </p>
          </div>
        )}
        {ai.kind === "error" && (
          <p className="rounded-lg border border-line p-3 text-sm text-muted">
            {ai.message}。上の「分かりやすさチェック」は引き続き使えます。
          </p>
        )}
      </div>
    </form>
  );
}
