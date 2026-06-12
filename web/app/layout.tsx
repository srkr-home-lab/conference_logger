import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conference Logger",
  description: "カンファレンス用のブロックメモ。Markdown コピー & ハッシュタグ付与に対応。",
  // ブラウザ翻訳による DOM 改変（React の removeChild クラッシュ）を防ぐ
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('conference-logger:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body className="notranslate" translate="no">
        {children}
      </body>
    </html>
  );
}
