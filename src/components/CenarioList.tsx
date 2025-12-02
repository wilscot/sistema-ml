'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import type { Cenario } from '@/types/cenario';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

interface CenarioListProps {
  cenarios: Cenario[];
  onDelete: (id: number) => void;
  loading?: boolean;
}

export function CenarioList({ cenarios, onDelete, loading = false }: CenarioListProps) {
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [cenarioToDelete, setCenarioToDelete] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setCenarioToDelete(id);
    setOpenAlertDialog(true);
  };

  const handleConfirmDelete = () => {
    if (cenarioToDelete !== null) {
      onDelete(cenarioToDelete);
      setCenarioToDelete(null);
      setOpenAlertDialog(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (cenarios.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum cenário criado"
        descricao="Clique em + Novo Cenário para simular."
      />
    );
  }

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        {cenarios.map((cenario) => (
          <AccordionItem key={cenario.id} value={`cenario-${cenario.id}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{cenario.nome}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Clássico: R$ {cenario.precoVendaClassico.toFixed(2)}</span>
                    <span>•</span>
                    <span>Premium: R$ {cenario.precoVendaPremium.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Anúncio Clássico
                    </div>
                    <div className="text-lg font-semibold mb-2">
                      R$ {cenario.precoVendaClassico.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Lucro:</span>
                      <Badge
                        variant={cenario.lucroClassico >= 0 ? 'default' : 'destructive'}
                        className={
                          cenario.lucroClassico >= 0
                            ? 'bg-green-600 hover:bg-green-700'
                            : ''
                        }
                      >
                        R$ {cenario.lucroClassico.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Taxa ML: {cenario.taxaClassico}%
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Anúncio Premium
                    </div>
                    <div className="text-lg font-semibold mb-2">
                      R$ {cenario.precoVendaPremium.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Lucro:</span>
                      <Badge
                        variant={cenario.lucroPremium >= 0 ? 'default' : 'destructive'}
                        className={
                          cenario.lucroPremium >= 0
                            ? 'bg-green-600 hover:bg-green-700'
                            : ''
                        }
                      >
                        R$ {cenario.lucroPremium.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Taxa ML: {cenario.taxaPremium}%
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(cenario.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Cenário
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AlertDialog open={openAlertDialog} onOpenChange={setOpenAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá deletar permanentemente o cenário. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
