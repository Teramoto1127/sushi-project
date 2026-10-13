// 回答の下書きを、投稿前に自分で見直すためのルールベースのチェック。
// 外部通信なし・点数なし。「良い点」と「もっと良くなる提案」だけを返す。

export type DraftCheck = {
  goods: string[];
  tips: string[];
};

const MAX_GOODS = 2;
const MAX_TIPS = 3;

// 突き放して聞こえやすい言い回し(「簡単に言うと」など普通の用法は拾わない)
const HARSH = /(普通は|常識|当たり前|そんなことも|基本でしょ|調べれば(?:すぐ)?分か|ググ|簡単なこと|簡単ですよ|なんで分からない)/;
const STEP_WORDS = /(まず|次に|それから|その後|最後に|①|②|1[.)）]|2[.)）])/g;
const LIST_LINE = /^\s*(?:[-*・●]|\d+[.)）])\s+/m;
const EXAMPLE = /(例えば|たとえば|例[:：)）]|例は|e\.g\.)/;
const LINK = /https?:\/\/\S+/;
const CODE = /(```|`[^`\n]+`)/;
const ASK_BACK = /[?？]|(でしょうか|ますか|ですか)/;
const ENCOURAGE = /(大丈夫|ありがとう|ぜひ|気軽に|頑張|いい質問|困りますよね|ですよね)/;

export function checkDraft(raw: string): DraftCheck {
  const text = raw.trim();
  const len = text.length;
  const lines = text.split(/\n/).filter((l) => l.trim());
  const hasList = LIST_LINE.test(text);
  const stepCount = (text.match(STEP_WORDS) ?? []).length;

  const goods: string[] = [];
  const tips: string[] = [];

  // --- 提案(優先度の高い順に積む) ---
  if (HARSH.test(text)) {
    tips.push(
      "「普通は」「当たり前」などの言い方は、質問した人が萎縮しやすいです。「私はこうしています」「こう考えると分かりやすいです」に言い換えると、気軽に追質問してもらえます。"
    );
  }
  if (len > 200 && lines.length === 1) {
    tips.push("改行がなく一続きです。話題ごとに空行で区切ると、スマホでも読みやすくなります。");
  }
  if (stepCount >= 3 && !hasList) {
    tips.push("手順が続いているようです。「1. 2. 3.」や「・」の箇条書きにすると、順番どおりに試してもらえます。");
  }
  if (len >= 150 && !EXAMPLE.test(text) && !CODE.test(text)) {
    tips.push("具体例やコードを1つ添えると、イメージが伝わりやすくなります。");
  }
  if (len >= 150 && !LINK.test(text)) {
    tips.push("参考になる公式ドキュメントやページがあれば、リンクを添えると親切です(無ければ不要です)。");
  }
  if (len >= 100 && !ASK_BACK.test(text)) {
    tips.push("「使っている環境は何ですか?」「どこまで試しましたか?」など、状況を聞き返す一言があると、的外れな回答になりにくいです。");
  }
  if (len < 40) {
    tips.push("少し短めです。結論に加えて、理由をひとこと添えると伝わりやすくなります。");
  }
  if (len > 1500) {
    tips.push("かなり長めです。最初に結論を書き、詳しい説明は後ろにまとめると読みやすくなります。");
  }

  // --- 良い点 ---
  if (hasList) goods.push("箇条書きで整理されていて読みやすいです。");
  if (EXAMPLE.test(text)) goods.push("具体例が入っていて、イメージしやすいです。");
  if (CODE.test(text)) goods.push("コードが入っていて、すぐ試してもらえます。");
  if (LINK.test(text)) goods.push("参考リンクが添えられていて親切です。");
  if (ASK_BACK.test(text) && len >= 100) goods.push("状況を確認する一言があり、相手に寄り添っています。");
  if (ENCOURAGE.test(text)) goods.push("励ましの一言があり、質問しやすい雰囲気です。");

  return { goods: goods.slice(0, MAX_GOODS), tips: tips.slice(0, MAX_TIPS) };
}
