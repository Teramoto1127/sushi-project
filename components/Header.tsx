import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { NavLink } from "./NavLink";

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { count: unread } = user
    ? await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
    : { count: 0 };

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/questions" className="text-lg font-bold">
          <span aria-hidden>🍣</span> 知恵袋
        </Link>
        {user && (
          <nav aria-label="メインメニュー" className="flex items-center gap-1 text-sm">
            <NavLink href="/questions">質問</NavLink>
            <NavLink href="/members">先輩を探す</NavLink>
            <NavLink href="/notifications">
              通知
              {unread ? (
                <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 text-xs text-white">{unread}</span>
              ) : null}
            </NavLink>
            <NavLink href="/profile/edit">プロフィール</NavLink>
            <form action={signOut}>
              <button className="rounded-md px-2 py-1 text-muted hover:text-foreground">ログアウト</button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}