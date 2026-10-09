"use client";
import { useState } from "react";

// 子要素のチェックボックス(name="tags")を数え、上限に達したら未選択のものを無効化する
export function TagLimit({ max, children }: { max: number; children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  function onChange(e: React.ChangeEvent<HTMLDivElement>) {
    const form = e.currentTarget;
    const boxes = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    const checked = boxes.filter((b) => b.checked).length;
    setCount(checked);
    boxes.forEach((b) => {
      b.disabled = !b.checked && checked >= max;
    });
  }

  return (
    <div onChange={onChange}>
      {children}
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {count} / {max} 個選択中
      </p>
    </div>
  );
}
