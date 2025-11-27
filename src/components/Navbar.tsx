'use client';

import { useState, useEffect } from 'react';
import { useMode } from '@/hooks/useMode';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ModeToggle from './ModeToggle';

export default function Navbar() {
  const { mode } = useMode();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const linksLab = [
    { href: '/lab/produtos', label: 'Produtos' },
    { href: '/lab/simulacao', label: 'Simulação' },
    { href: '/lab/lixeira', label: 'Lixeira' },
    { href: '/lab/configuracoes', label: 'Configurações' },
  ];

  const linksProd = [
    { href: '/prod/dashboard', label: 'Dashboard' },
    { href: '/prod/produtos', label: 'Produtos' },
    { href: '/prod/compras', label: 'Compras' },
    { href: '/prod/vendas', label: 'Vendas' },
    { href: '/prod/lixeira', label: 'Lixeira' },
    { href: '/prod/configuracoes', label: 'Configurações' },
  ];

  const links = mounted && mode === 'LAB' ? linksLab : linksProd;

  if (!mounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">Sistema ML v2.0</h1>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold">Sistema ML v2.0</h1>
          <div className="flex gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm ${
                  pathname === link.href
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <ModeToggle />
      </div>
    </nav>
  );
}
