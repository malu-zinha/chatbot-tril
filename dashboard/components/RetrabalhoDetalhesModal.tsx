import React from 'react'
import { X } from 'lucide-react'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projetoCodigo?: string;
  cliente?: string;
  detalhes?: any[];
  areasProjeto?: any[];
  motivosProjeto?: any[];
}

export default function RetrabalhoDetalhesModal({
  isOpen,
  onClose,
  projetoCodigo,
  cliente,
  detalhes = [],
  areasProjeto = [],
  motivosProjeto = []
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Detalhes do Retrabalho: {projetoCodigo} - {cliente}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Este modal exibe os detalhes em construção. {detalhes.length} detalhes carregados.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
