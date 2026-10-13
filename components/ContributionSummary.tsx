import { computeBadges, nextHelpfulGoal, strengths } from "@/lib/badges";
import type { Stats } from "@/lib/contribution";

// 貢献の集計・強み・称号の表示。自分用ページと、公開の貢献ページで共通。
export function ContributionSummary({ stats, showNextGoal = false }: { stats: Stats; showNextGoal?: boolean }) {
  const badges = computeBadges(stats);
  const top = strengths(stats.reasons);
  const max = Math.max(1, ...top.map((t) => t.count));
  const goal = nextHelpfulGoal(stats.helpful);

  const tiles = [
    { label: "回答", value: stats.answers },
    { label: "助かった", value: stats.helpful },
    { label: "解決の決め手", value: stats.solved },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="貢献の数" className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="card text-center">
            <p className="text-2xl font-bold">{t.value}</p>
            <p className="text-xs text-muted">{t.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="strengths-heading">
        <h2 id="strengths-heading" className="font-semibold">伝えてもらった強み</h2>
        {top.length === 0 ? (
          <p className="text-sm text-muted">「助かった」に理由が届くと、ここに強みが表示されます。</p>
        ) : (
          <ul className="space-y-2">
            {top.map((t) => (
              <li key={t.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{t.label}</span>
                  <span className="text-xs text-muted">{t.count} 回</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--accent-soft)]" aria-hidden>
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(t.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="font-semibold">称号</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-muted">回答すると、最初の称号がもらえます。</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {badges.map((b) => (
              <li key={b.id} className="card flex items-start gap-3">
                <span className="text-xl" aria-hidden>{b.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-xs text-muted">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {showNextGoal && goal && (
          <p className="text-xs text-muted">
            「{goal.title}」まで、あと {goal.remaining} 件の「助かった」。急がなくて大丈夫です。
          </p>
        )}
      </section>
    </div>
  );
}
