import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "知恵袋 | 武蔵野大学", template: "%s | 知恵袋" },
  description: "学生どうしで質問し合い、先輩を探せるコミュニティ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 日本語フォント。読み込めない間や失敗したときは、端末の日本語フォントで表示される */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap"
        />
      </head>
      {/* pb-20: スマホでは、下のタブバーに内容が隠れないようにする */}
      <body className="flex min-h-full flex-col pb-20 md:pb-0">
        <Header />
        {children}
      </body>
    </html>
  );
}
