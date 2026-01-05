'use client';

import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModalRegistrarRecebimentoProps {
  lote: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalRegistrarRecebimento({ lote, onClose, onSuccess }: ModalRegistrarRecebimentoProps) {
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [statusEntrega, setStatusEntrega] = useState('ok');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens sao permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Maximo 5MB');
      return;
    }

    setArquivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      let filePath = null;

      // Upload da foto (opcional)
      if (arquivo) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', arquivo);

        const uploadRes = await fetch('/api/upload/etiqueta', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          throw new Error(error.error || 'Erro no upload');
        }

        const uploadData = await uploadRes.json();
        filePath = uploadData.filePath;
        setUploading(false);
      }

      // Registrar recebimento
      const res = await fetch(`/api/lotes-china/${lote.id}/registrar-recebimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataRecebimento: Math.floor(new Date(dataRecebimento).getTime() / 1000),
          codigoRastreio: codigoRastreio || null,
          fotoEtiqueta: filePath,
          observacoes: observacoes || null,
          statusEntrega
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao registrar recebimento');
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Erro ao registrar recebimento');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Registrar Recebimento</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Lote #{lote.numeroLote} - {lote.quantidade} unidades
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Data de Recebimento */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Data de Recebimento *
            </label>
            <input
              type="date"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Editavel - ajuste se recebeu em outro dia
            </p>
          </div>

          {/* Codigo de Rastreio */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Codigo de Rastreio (opcional)
            </label>
            <input
              type="text"
              value={codigoRastreio}
              onChange={(e) => setCodigoRastreio(e.target.value)}
              placeholder="BR123456789CN"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Upload Foto */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Foto da Etiqueta (opcional)
            </label>
            <div
              onClick={() => document.getElementById('file-input-recebimento')?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${previewUrl ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-border hover:border-primary hover:bg-muted/50'}
              `}
            >
              {previewUrl ? (
                <div>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-32 mx-auto rounded mb-2"
                  />
                  <p className="text-sm font-semibold text-green-600">
                    {arquivo?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique para alterar
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    Clique para fazer upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG ate 5MB
                  </p>
                </div>
              )}
            </div>
            <input
              id="file-input-recebimento"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Status Entrega */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Status da Entrega
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="ok"
                  checked={statusEntrega === 'ok'}
                  onChange={(e) => setStatusEntrega(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Normal - Adiciona ao estoque</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="devolvido"
                  checked={statusEntrega === 'devolvido'}
                  onChange={(e) => setStatusEntrega(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Devolvido pela Receita - NAO adiciona estoque</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="problemas"
                  checked={statusEntrega === 'problemas'}
                  onChange={(e) => setStatusEntrega(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Problemas na Entrega - NAO adiciona estoque</span>
              </label>
            </div>
          </div>

          {/* Aviso de status */}
          {statusEntrega !== 'ok' && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Atencao: Com status &quot;{statusEntrega}&quot;, as {lote.quantidade} unidades NAO serao adicionadas ao estoque.
              </p>
            </div>
          )}

          {/* Observacoes */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Observacoes (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Informacoes adicionais..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          {/* Botoes */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fazendo upload...
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Recebimento'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

