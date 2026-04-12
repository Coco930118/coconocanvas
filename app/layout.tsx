import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '静かな調律師 ／ 投稿生成スタジオ',
  description: '40年の現場から出てくる、枯れた・泥臭く・静かに鋭い言葉を生み出す装置',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-[#111111] text-[#e5e5e5] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
