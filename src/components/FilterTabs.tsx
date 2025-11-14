'use client';

interface FilterTabsProps {
  value: 'LAB' | 'PROD';
  onChange: (tipo: 'LAB' | 'PROD') => void;
}

export default function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div className="flex space-x-1 border-b border-border">
      <button
        onClick={() => onChange('LAB')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
          value === 'LAB'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        Simulação (LAB)
      </button>
      <button
        onClick={() => onChange('PROD')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
          value === 'PROD'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        Produção (PROD)
      </button>
    </div>
  );
}
