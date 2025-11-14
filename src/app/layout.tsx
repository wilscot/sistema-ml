import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema Gestão ML',
  description:
    'Sistema desktop para gestão de produtos importados, registro de custos básicos, simulação de cenários de preço e lucro, controle manual de vendas, estoque e ambientes LAB/PROD independentes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Navbar />
        {children}
        {/* Toaster será adicionado após instalar shadcn/ui toast */}
      </body>
    </html>
  );
}
