import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavLink, TabLink } from "./NavLink";
import { shouldShowBanner, weekStart } from "@/lib/research";

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { count: unread } = user
    ? await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
    : { count: 0 };

  let showResearch = false;
  if (user) {
    const [{ data: part }, { data: done }] = await Promise.all([
      supabase.from("research_participants").select("withdrawn_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("research_checkins").select("id").eq("user_id", user.id).eq("week_start", weekStart()).maybeSingle(),
    ]);
    showResearch = shouldShowBanner({ participant: part, answeredThisWeek: !!done });
  }

  const MYPAGE = ["/contribution", "/profile", "/for-you", "/research", "/u"] as const;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex min-h-15 max-w-5xl items-center justify-between gap-3 px-4 py-1.5 md:px-6">
          <Link href="/questions" className="flex flex-col leading-tight md:flex-row md:items-baseline md:gap-2.5">
            <span className="font-[family-name:var(--font-heading)] text-xl font-bold">知恵袋</span>
            <span className="text-[11px] text-muted md:text-xs">武蔵野大学 先輩に聞ける</span>
          </Link>
          {user && (
            <div className="flex items-center gap-1">
              <nav aria-label="メインメニュー" className="hidden items-center gap-1 md:flex">
                <NavLink href="/questions" also={["/for-you"]}>質問</NavLink>
                <NavLink href="/members" also={["/contact"]}>先輩を探す</NavLink>
                <NavLink href="/notifications">
                  通知
                  {unread ? (
                    <span className="ml-1.5 min-w-[18px] rounded-full bg-[var(--danger)] px-1 text-center text-[11px] leading-[18px] text-white">
                      {unread}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink href="/contribution" also={MYPAGE}>マイページ</NavLink>
              </nav>
              <Link href="/questions/new" className="btn btn-primary ml-1 md:ml-3">質問する</Link>
            </div>
          )}
        </div>
        {showResearch && (
          <div className="border-t border-line bg-[var(--accent-soft)] px-4 py-2 text-center text-sm text-[var(--accent-soft-fg)]">
            今週の研究の回答(1分)がまだです。
            <Link href="/research" className="ml-1 font-bold underline">回答する</Link>
          </div>
        )}
      </header>

      {user && (
        <nav
          aria-label="メインメニュー"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface md:hidden"
        >
          <TabLink href="/questions" also={["/for-you"]} icon="question" label="質問" />
          <TabLink href="/members" also={["/contact"]} icon="people" label="先輩を探す" />
          <TabLink href="/notifications" icon="bell" label="通知" badge={unread ?? 0} />
          <TabLink href="/contribution" also={MYPAGE} icon="user" label="マイページ" />
        </nav>
      )}
    </>
  );
}
