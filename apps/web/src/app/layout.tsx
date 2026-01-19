import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Matcha Trading Platform',
  description: 'B2B Matcha Trading Platform - Connect Buyers and Sellers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
