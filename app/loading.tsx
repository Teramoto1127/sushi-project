export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 p-4 sm:p-6" aria-busy="true" aria-label="読み込み中">
      <div className="h-7 w-40 animate-pulse rounded bg-line" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-line" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-line" />
        </div>
      ))}
    </main>
  );
}
