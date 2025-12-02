import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  titulo: string;
  descricao: string;
  icone?: ReactNode;
  acao?: {
    texto: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  titulo,
  descricao,
  icone,
  acao,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icone && <div className="mb-4 text-muted-foreground">{icone}</div>}
      <p className="text-lg font-medium mb-2 text-foreground">{titulo}</p>
      <p className="text-sm text-muted-foreground mb-4">{descricao}</p>
      {acao && (
        <Button onClick={acao.onClick} variant="default">
          {acao.texto}
        </Button>
      )}
    </div>
  );
}

