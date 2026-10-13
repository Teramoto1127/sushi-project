// メール送信。Resend の REST API を使う(追加のライブラリは不要)。
//
// 必要な環境変数(サーバー側のみ。NEXT_PUBLIC_ は付けない):
//   RESEND_API_KEY ... Resend の API キー
//   MAIL_FROM      ... 送信元。例: 知恵袋 <noreply@あなたのドメイン>
//                      Resend は、自分のドメインを認証しないと、自分のアカウント宛てにしか送れない。
// 別のサービスに替えるときは、この sendMail の中身だけを差し替えればよい。

export type MailInput = { to: string; subject: string; text: string; replyTo?: string };
export type MailResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

type Env = Record<string, string | undefined>;

export function isMailConfigured(env: Env = process.env): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

export async function sendMail(
  mail: MailInput,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<MailResult> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return { ok: false, reason: "not_configured" };

  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
