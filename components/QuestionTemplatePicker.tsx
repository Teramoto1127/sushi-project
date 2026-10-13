"use client";
import { useState } from "react";
import { QUESTION_TEMPLATES, findTemplate, isUntouchedBody } from "@/lib/questionTemplates";

// 質問フォームの上に置く、カテゴリ別のテンプレートと投稿例。
// フォームの入力欄(#title, #body)に直接書き込む。選ばなくても質問は投稿できる。
export function QuestionTemplatePicker() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showExample, setShowExample] = useState(false);
  const active = activeId ? findTemplate(activeId) : undefined;

  const fields = () => ({
    title: document.getElementById("title") as HTMLInputElement | null,
    body: document.getElementById("body") as HTMLTextAreaElement | null,
  });

  function select(id: string) {
    setActiveId(id === activeId ? null : id);
    setShowExample(false);
  }

  function insertTemplate() {
    if (!active) return;
    const { body, title } = fields();
    if (!body) return;
    if (!isUntouchedBody(body.value) && !window.confirm("いま書いている内容を、テンプレートで置き換えますか?")) {
      return;
    }
    body.value = active.body;
    if (title) title.placeholder = `例: ${active.example.title}`;
    body.focus();
    body.setSelectionRange(body.value.length, body.value.length);
  }

  function copyExample() {
    if (!active) return;
    const { body, title } = fields();
    if (!body) return;
    const dirty = !isUntouchedBody(body.value) || (title?.value.trim() ?? "") !== "";
    if (dirty && !window.confirm("いま書いている内容を、投稿例で置き換えますか?(自分の質問に書き換えて使ってください)")) {
      return;
    }
    body.value = active.example.body;
    if (title) title.value = active.example.title;
    body.focus();
  }

  return (
    <section className="card space-y-3" aria-labelledby="template-heading">
      <div>
        <h2 id="template-heading" className="text-sm font-semibold">書き方に迷ったら</h2>
        <p className="text-xs text-muted">
          カテゴリを選ぶと、書き方のテンプレートと投稿例が見られます。使わなくても投稿できます。
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="質問のカテゴリ">
        {QUESTION_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            aria-pressed={activeId === t.id}
            className={`check-chip ${activeId === t.id ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-soft-fg)]" : ""}`}
          >
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="space-y-3 text-sm" aria-live="polite">
          <p>{active.hint}</p>
          <p className="text-xs text-muted">タイトルの目安: {active.titleHint}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={insertTemplate} className="btn btn-primary text-xs">
              テンプレートを内容に入れる
            </button>
            <button type="button" onClick={() => setShowExample((v) => !v)} aria-expanded={showExample} className="btn text-xs">
              {showExample ? "投稿例を閉じる" : "投稿例を見る"}
            </button>
          </div>

          {showExample && (
            <div className="space-y-2 rounded-lg border border-line p-3">
              <p className="text-xs text-muted">投稿例(架空の内容です)</p>
              <p className="font-semibold">{active.example.title}</p>
              <p className="whitespace-pre-wrap text-sm">{active.example.body}</p>
              <button type="button" onClick={copyExample} className="btn text-xs">
                この例を入力欄にコピーして書き換える
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
