import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AppShellProvider } from "@/components/app-shell";
import { ServiceWorker } from "@/components/service-worker";

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
  // /manifest.webmanifest は src/app/manifest.ts が生成する
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // iOS でホーム画面から開いたときブラウザUIを出さない
    capable: true,
    title: "prompt-keep",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // 端末のUI（ステータスバー等）の色。ヘッダーと同じ白にして境目を消す
  themeColor: "#ffffff",
  // ノッチのある端末で背景を端まで敷く
  viewportFit: "cover",
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
        <ServiceWorker />
        <AppShellProvider>
          <SiteHeader />
          <main className="flex min-h-0 w-full flex-1 flex-col">{children}</main>
        </AppShellProvider>
      </body>
    </html>
  );
}
