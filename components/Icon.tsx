// 線だけのアイコン(絵文字のかわり)。意味は隣の文字で伝えるので、アイコン自体は読み上げない。
const PATHS = {
  question: "M4 5h16v11H9l-5 4z",
  people:
    "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M17 4.5a3.2 3.2 0 010 6M18.5 14.2c2 .7 3.5 2.6 3.5 5.3",
  bell: "M6 17V11a6 6 0 1112 0v6l1.5 2h-15zM10 21h4",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-7 8-7s8 3 8 7",
  back: "M15 5l-7 7 7 7",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
