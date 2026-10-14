// 回答・返信が付いたときに、誰に何の通知を送るか(画面・DBに依存しない部分)。

export type NewNotification = { user_id: string; type: "answer" | "reply" };

/**
 * - 質問への回答(parentAuthor なし): 質問者に "answer"
 * - 回答への返信(追質問): 返信先の回答者と、質問者に "reply"(同じ人には1件だけ)
 * 自分自身には送らない。
 */
export function notificationTargets(i: {
  actor: string;
  questionAuthor: string | null;
  parentAuthor: string | null;
}): NewNotification[] {
  const out: NewNotification[] = [];
  const seen = new Set<string>([i.actor]);
  const add = (id: string | null, type: NewNotification["type"]) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ user_id: id, type });
  };
  if (i.parentAuthor === null) {
    add(i.questionAuthor, "answer");
  } else {
    add(i.parentAuthor, "reply");
    add(i.questionAuthor, "reply");
  }
  return out;
}
