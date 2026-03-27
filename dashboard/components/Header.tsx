import React from 'react'
import { RefreshCw } from 'lucide-react'

interface HeaderProps {
  lastUpdate: Date | null
  isLoading: boolean
}

export default function Header({ lastUpdate, isLoading }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-tecpred-primary via-tecpred-secondary to-tecpred-primary shadow-lg border-b-4 border-tecpred-orange">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="bg-white px-6 py-3 rounded-lg shadow-lg border-2 border-tecpred-orange">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-tecpred-primary rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-tecpred-primary to-tecpred-secondary bg-clip-text text-transparent">
                  TecPred
                </h1>
              </div>
            </div>
            <div className="hidden md:block">
              <h2 className="text-white text-lg font-semibold">
                Dashboard Executivo
              </h2>
              <p className="text-white text-opacity-80 text-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-tecpred-orange rounded-full animate-pulse"></span>
                Visão em Tempo Real
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white bg-opacity-10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white border-opacity-20">
              <RefreshCw 
                className={`w-4 h-4 text-tecpred-orange ${isLoading ? 'animate-spin' : ''}`} 
              />
              <div className="text-white text-sm">
                <div className="font-semibold">
                  {isLoading ? 'Atualizando...' : 'Ao vivo'}
                </div>
                {lastUpdate && (
                  <div className="text-xs opacity-80">
                    {lastUpdate.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-success bg-opacity-20 px-3 py-2 rounded-lg border border-success">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse-slow shadow-lg shadow-success"></div>
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

