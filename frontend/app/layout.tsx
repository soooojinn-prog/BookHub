import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "책바퀴 — 책을 돌려 마음을 잇다",
  description: "교환독서 모임 책바퀴: 지금 돌고 있는 책과 함께 쌓은 기록.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
