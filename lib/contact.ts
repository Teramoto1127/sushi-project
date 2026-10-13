// 先輩への連絡(メール)の、画面に依存しない部分。入力の検証・送信回数の上限・メール本文の組み立て。

export type ContactState = { error?: string; message?: string } | null;

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1000;
/** 1人が1日に送れる件数 */
export const DAILY_LIMIT = 3;
/** 同じ先輩に、続けて送れるようになるまでの時間 */
export const SAME_TARGET_HOURS = 72;

export const CONTACT_CATEGORIES = [
  {
    id: "question",
    label: "投稿した質問について",
    placeholder: "はじめまして、◯年の◯◯です。投稿した質問について、もう少し詳しく相談させてください。",
  },
  {
    id: "course",
    label: "授業・課題の相談",
    placeholder: "はじめまして、◯年の◯◯です。◯◯の授業について、勉強の進め方を教えてください。",
  },
  {
    id: "career",
    label: "進路・就活の相談",
    placeholder: "はじめまして、◯年の◯◯です。◯◯の分野に興味があり、経験を聞かせてほしいです。",
  },
  {
    id: "other",
    label: "その他",
    placeholder: "はじめまして、◯年の◯◯です。",
  },
] as const;

export type ContactCategoryId = (typeof CONTACT_CATEGORIES)[number]["id"];
export const CONTACT_CATEGORY_IDS = CONTACT_CATEGORIES.map((c) => c.id) as [
  ContactCategoryId,
  ...ContactCategoryId[],
];
export const categoryLabel = (id: string) =>
  CONTACT_CATEGORIES.find((c) => c.id === id)?.label ?? "その他";

// 1行のテキスト(名前・件名など)から、改行や制御文字を取り除く。メールのヘッダーを壊されないようにするため
export function sanitizeLine(s: string, max = 60): string {
  return s
    .replace(/[\u0000-\u001f\u007f]/g, " ") // 以降の \s で、U+2028 などの行区切りも空白になる
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const HOUR = 60 * 60 * 1000;

// 送信の履歴から、いま送ってよいかを判断する。送れないときは理由(画面に出す文)を返す。
export function checkLimits(
  history: readonly { to_user: string; created_at: string }[],
  target: string,
  now: Date = new Date()
): string | null {
  const t = now.getTime();
  const within = (iso: string, ms: number) => t - new Date(iso).getTime() < ms;

  if (history.filter((h) => within(h.created_at, 24 * HOUR)).length >= DAILY_LIMIT) {
    return `1日に送れるのは${DAILY_LIMIT}件までです。明日また送れます。`;
  }
  if (history.some((h) => h.to_user === target && within(h.created_at, SAME_TARGET_HOURS * HOUR))) {
    return "この先輩には、先ほど送ったばかりです。返信を待つか、しばらくしてからもう一度送ってください。";
  }
  return null;
}

export type EmailInput = {
  targetName: string;
  senderName: string;
  senderGrade: number | null;
  senderSeminar: string | null;
  senderEmail: string;
  categoryId: string;
  message: string;
  question?: { id: string; title: string } | null;
  /** 例: https://example.com (末尾のスラッシュなし)。無ければリンクは入れない */
  siteUrl?: string;
};

// 先輩に届くメール(テキストのみ。HTMLにしない)
export function buildContactEmail(i: EmailInput): { subject: string; text: string } {
  const sender = sanitizeLine(i.senderName, 30) || "後輩";
  const target = sanitizeLine(i.targetName, 30) || "先輩";
  const who =
    `${sender}さん` +
    (i.senderGrade || i.senderSeminar
      ? `(${i.senderGrade ? `${i.senderGrade}年` : ""}${i.senderGrade && i.senderSeminar ? "・" : ""}${sanitizeLine(i.senderSeminar ?? "", 30)})`
      : "");
  const site = i.siteUrl?.replace(/\/+$/, "");

  const lines = [
    `${target}さん`,
    "",
    `${who}から、知恵袋を通じて相談が届きました。`,
    "",
    "■ 相談の種類",
    categoryLabel(i.categoryId),
    "",
    "■ 内容",
    i.message.trim(),
    "",
  ];
  if (i.question) {
    lines.push("■ 関連する質問", sanitizeLine(i.question.title, 100));
    if (site) lines.push(`${site}/questions/${i.question.id}`);
    lines.push("");
  }
  lines.push(
    "■ 返信について",
    `このメールに返信すると、${sender}さんのメールアドレス(${sanitizeLine(i.senderEmail, 100)})に届きます。`,
    "返信するかどうかは自由です。無理に対応する必要はありません。",
    "",
    "■ 相談の受付について",
    "このメールは、あなたがプロフィールで「相談を受け付ける」に設定しているため届きました。",
    site
      ? `受付を止めたい・休みたいときは、こちらから設定できます: ${site}/contribution`
      : "受付を止めたい・休みたいときは、知恵袋の「貢献」ページ(休止)や、プロフィールから設定できます。"
  );

  return { subject: `【知恵袋】${sender}さんから相談が届きました`, text: lines.join("\n") };
}
