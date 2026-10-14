// 研究への協力(毎週の短い回答)の、画面に依存しない部分。
import { z } from "zod";

const JST_MS = 9 * 60 * 60 * 1000;

/** その週の月曜日(日本時間)。例: 2026-10-14(水) → "2026-10-12" */
export function weekStart(d: Date | string = new Date()): string {
  const jst = new Date(new Date(d).getTime() + JST_MS);
  const dow = (jst.getUTCDay() + 6) % 7; // 月=0 … 日=6
  jst.setUTCDate(jst.getUTCDate() - dow);
  return jst.toISOString().slice(0, 10);
}

export const EASE_LABELS = [
  "1 とても続けにくい",
  "2 やや続けにくい",
  "3 どちらでもない",
  "4 やや続けやすい",
  "5 とても続けやすい",
] as const;

const optionalText = z
  .string()
  .trim()
  .max(300, "300文字までです")
  .transform((v) => (v === "" ? null : v));

export const CheckinSchema = z.object({
  ease: z.coerce.number().int().min(1, "選んでください").max(5, "選んでください"),
  reason: optionalText,
  wish: optionalText,
});

export type BannerInput = {
  participant: { withdrawn_at: string | null } | null;
  answeredThisWeek: boolean;
};

/** 参加中で、今週まだ答えていない(「答えない」も含めて、答え済みなら出さない)ときだけ出す */
export const shouldShowBanner = (i: BannerInput): boolean =>
  !!i.participant && !i.participant.withdrawn_at && !i.answeredThisWeek;

export const CONSENT_POINTS = [
  "この研究は、先輩と後輩のつながりが続くには何が必要かを調べるものです。",
  "お願いするのは、週に1回・1分ほどの回答(3問、2問は任意)です。",
  "回答は研究の目的だけに使い、個人が特定される形では公開しません。",
  "参加は自由で、いつでも抜けられます。抜けたときに、自分の回答を消すこともできます。",
  "参加しなくても、知恵袋の機能は同じように使えます。",
  "回答しなかった週は「今週は答えない」を選べます。理由は聞きません。",
] as const;

// 「自分の研究へのフィードバック」の質問テンプレートが入れる見出し。質問の見分けに使う。
export const RESEARCH_MARKER = "【研究のテーマ】";
export const isResearchBody = (body: string): boolean => body.includes(RESEARCH_MARKER);
