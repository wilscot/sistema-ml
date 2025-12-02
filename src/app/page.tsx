'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMode } from '@/hooks/useMode';
import LoadingSpinner from '@/components/LoadingSpinner';

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

  return <LoadingSpinner />;
}
