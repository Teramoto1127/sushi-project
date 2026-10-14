import Link from "next/link";
import { Icon } from "@/components/Icon";

// 画面の左上の「戻る」。大きく押せるようにしてある。
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-[15px] text-muted hover:text-foreground">
      <Icon name="back" size={18} />
      {children}
    </Link>
  );
}
