import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'mesh bakery | catalogue',
  description: 'catalogue of freshly baked 3D prints',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#FAF8F5] text-[#3D3A36] lowercase" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
