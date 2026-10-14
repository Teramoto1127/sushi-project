// 「3時間前」のような、短い経過時間の表示。一覧で、質問が新しいかどうかをひと目で分かるようにする。
export function timeAgo(iso: string, now: Date = new Date()): string {
  const sec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(sec) || sec < 60) return "たった今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return day === 1 ? "昨日" : `${day}日前`;
  if (day < 30) return `${Math.floor(day / 7)}週間前`;
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}
