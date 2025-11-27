import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ModeProvider } from '@/contexts/ModeContext';
import { Toaster } from '@/components/ui/toaster';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema ML v2.0',
  description: 'Sistema de gestão Mercado Livre',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ModeProvider>
          <Navbar />
          <main className="container mx-auto p-4 pt-20">{children}</main>
          <Toaster />
        </ModeProvider>
      </body>
    </html>
  );
}
