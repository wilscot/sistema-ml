'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMode } from '@/hooks/useMode';

export default function HomePage() {
  const router = useRouter();
  const { mode } = useMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (mode === 'LAB') {
        router.push('/lab/produtos');
      } else {
        router.push('/prod/dashboard');
      }
    }
  }, [mode, router, mounted]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
