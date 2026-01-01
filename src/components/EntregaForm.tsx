'use client';

import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EntregaFormProps {
  compraId: number;
  quantidadePendente: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EntregaForm({ compraId, quantidadePendente, onClose, onSuccess }: EntregaFormProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [dataRecebimento, setDataRecebimento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB');
      return;
    }

    setArquivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantidade > quantidadePendente) {
      alert(`Quantidade excede o pendente. Restam ${quantidadePendente} unidades`);
      return;
    }

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

      // Criar entrega
      const dataTimestamp = Math.floor(new Date(dataRecebimento).getTime() / 1000);

      const res = await fetch('/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compraId,
          quantidadeRecebida: quantidade,
          dataRecebimento: dataTimestamp,
          codigoRastreio: codigoRastreio || null,
          fotoEtiqueta: filePath,
          observacoes: observacoes || null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao registrar entrega');
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Erro ao registrar entrega');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Registrar Nova Entrega</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quantidade */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Quantidade Recebida *
            </label>
            <input
              type="number"
              min="1"
              max={quantidadePendente}
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Restam {quantidadePendente} unidades para receber
            </p>
          </div>

          {/* Data */}
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
          </div>

          {/* Rastreio */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Código de Rastreio (opcional)
            </label>
            <input
              type="text"
              value={codigoRastreio}
              onChange={(e) => setCodigoRastreio(e.target.value)}
              placeholder="Ex: BR123456789CN"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Upload Foto */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Foto da Etiqueta (opcional)
            </label>
            <div
              onClick={() => document.getElementById('file-input')?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${previewUrl ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-border hover:border-primary hover:bg-muted/50'}
              `}
            >
              {previewUrl ? (
                <div>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded mb-3"
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
                  <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-semibold">
                    Clique para fazer upload da foto da etiqueta
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG até 5MB
                  </p>
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Informações adicionais sobre a entrega..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          {/* Botões */}
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
                'Salvar Entrega'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

