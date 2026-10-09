import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md p-6 pt-12">
      <div className="card space-y-3 text-center">
        <h1 className="text-lg font-bold">ページが見つかりません</h1>
        <p className="text-sm text-muted">削除されたか、URLが間違っている可能性があります。</p>
        <Link href="/questions" className="btn btn-primary">質問一覧へ</Link>
      </div>
    </main>
  );
}
