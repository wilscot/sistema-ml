'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log erro no console apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro capturado pelo Error Boundary:', error);
    }
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Ops! Algo deu errado
          </h1>
          <p className="text-muted-foreground mb-6">
            Ocorreu um erro inesperado. Por favor, tente novamente.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="bg-muted p-4 rounded-md mb-6 text-left">
              <p className="text-sm font-mono text-muted-foreground">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Tentar Novamente
            </button>
            <a
              href="/"
              className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              Voltar ao Início
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

