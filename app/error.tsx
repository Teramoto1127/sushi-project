"use client";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-md p-6 pt-12">
      <div className="card space-y-3 text-center" role="alert">
        <h1 className="text-lg font-bold">うまくいきませんでした</h1>
        <p className="text-sm text-muted">{error.message || "時間をおいてもう一度お試しください。"}</p>
        <button onClick={() => unstable_retry()} className="btn btn-primary">もう一度試す</button>
      </div>
    </main>
  );
}
