import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AppShellProvider } from "@/components/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "prompt-keep",
    template: "%s | prompt-keep",
  },
  description: "よく使うAIプロンプトを貯めて、探して、すぐコピーできる個人用のプロンプト管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          横幅の制約はページ側で付ける。プロンプト一覧はサイドバーを画面の左端まで
          寄せるため、ここで中央寄せの max-width を掛けてしまうと逃げられない。
        */}
        <AppShellProvider>
          <SiteHeader />
          <main className="flex min-h-0 w-full flex-1 flex-col">{children}</main>
        </AppShellProvider>
      </body>
    </html>
  );
}
