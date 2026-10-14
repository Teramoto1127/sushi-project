"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

// `also` は、同じメニューの下にある別のパス(例: マイページの下の /profile)。
function useActive(href: string, also: readonly string[] = []) {
  const pathname = usePathname();
  return [href, ...also].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

// PC: ヘッダーの横並びのメニュー
export function NavLink({
  href, also, children,
}: { href: string; also?: readonly string[]; children: React.ReactNode }) {
  const active = useActive(href, also);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-lg px-3.5 text-[15px] ${
        active ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-soft-fg)]" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

// スマホ: 画面の下のタブ
export function TabLink({
  href, also, icon, label, badge,
}: { href: string; also?: readonly string[]; icon: IconName; label: string; badge?: number }) {
  const active = useActive(href, also);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 ${
        active ? "text-[var(--accent)]" : "text-muted"
      }`}
    >
      <span className="relative inline-flex">
        <Icon name={icon} />
        {badge ? (
          <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-[var(--danger)] px-1 text-center text-[11px] leading-4 text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[11px] font-bold">{label}</span>
    </Link>
  );
}
