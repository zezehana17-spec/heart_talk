import type { Metadata } from 'next';
import './globals.css';
import '@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css';

export const metadata: Metadata = {
  title: 'Heart Talk Test',
  description: 'Heart English real-time speaking room prototype',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
