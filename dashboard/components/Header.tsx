import React from 'react'
import { RefreshCw } from 'lucide-react'

interface HeaderProps {
  lastUpdate: Date | null
  isLoading: boolean
}

export default function Header({ lastUpdate, isLoading }: HeaderProps) {
  return (
    <header className="bg-tecpred-primary shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="bg-white px-6 py-2 rounded-lg shadow-md">
              <h1 className="text-2xl font-bold text-tecpred-primary">
                TecPred
              </h1>
            </div>
            <div className="hidden md:block">
              <h2 className="text-white text-lg font-semibold">
                Dashboard Executivo
              </h2>
              <p className="text-tecpred-light text-sm">
                Visão em Tempo Real
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-tecpred-secondary px-4 py-2 rounded-lg">
              <RefreshCw 
                className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} 
              />
              <div className="text-white text-sm">
                <div className="font-semibold">
                  {isLoading ? 'Atualizando...' : 'Ao vivo'}
                </div>
                {lastUpdate && (
                  <div className="text-xs text-tecpred-light">
                    {lastUpdate.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse-slow"></div>
              <span className="text-white text-sm font-medium">
                Conectado
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

