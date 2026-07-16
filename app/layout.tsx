import type { Metadata } from 'next';
import './globals.css';
import { BASE_PATH } from '@/lib/config';
import { CartProvider } from '@/components/CartProvider';

export const metadata: Metadata = {
  title: 'mesh bakery | 3D Printing Bakery',
  description: 'catalogue of freshly baked 3D prints',
  icons: {
    icon: `${BASE_PATH}/favicon.svg`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#FBF7F2] text-[#3D3A36] lowercase" suppressHydrationWarning>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
