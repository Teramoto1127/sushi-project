"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2 py-1 ${
        active ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-soft-fg)]" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
