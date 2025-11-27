'use client';

import { useState, useEffect } from 'react';
import { useMode } from '@/hooks/useMode';
import { Button } from '@/components/ui/button';

export default function ModeToggle() {
  const { mode, setMode } = useMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = () => {
    setMode(mode === 'LAB' ? 'PROD' : 'LAB');
  };

  if (!mounted) {
    return (
      <Button variant="default" size="sm" disabled>
        Carregando...
      </Button>
    );
  }

  return (
    <Button
      onClick={toggle}
      variant={mode === 'LAB' ? 'default' : 'secondary'}
      size="sm"
    >
      {mode === 'LAB' ? '🧪 LAB' : '🏭 PROD'}
    </Button>
  );
}
