'use client';

import { createContext, useState, useEffect, ReactNode, useMemo } from 'react';

type Mode = 'LAB' | 'PROD';

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const defaultContextValue: ModeContextValue = {
  mode: 'LAB',
  setMode: () => {},
};

export const ModeContext = createContext<ModeContextValue>(defaultContextValue);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('LAB');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sistema-ml-mode') as Mode | null;
        if (saved && (saved === 'LAB' || saved === 'PROD')) {
          setMode(saved);
        }
      } catch (error) {
        console.warn('Erro ao ler localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      try {
        localStorage.setItem('sistema-ml-mode', mode);
      } catch (error) {
        console.warn('Erro ao salvar no localStorage:', error);
      }
    }
  }, [mode, mounted]);

  const contextValue = useMemo(
    () => ({
      mode,
      setMode: (newMode: Mode) => {
        if (newMode === 'LAB' || newMode === 'PROD') {
          setMode(newMode);
        }
      },
    }),
    [mode]
  );

  return (
    <ModeContext.Provider value={contextValue}>
      {children}
    </ModeContext.Provider>
  );
}
