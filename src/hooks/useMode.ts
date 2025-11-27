'use client';

import { useContext } from 'react';
import { ModeContext } from '@/contexts/ModeContext';
import type { ModeContextValue } from '@/types/mode';

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  return context;
}
