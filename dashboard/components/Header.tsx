import React from 'react'
import { RefreshCw } from 'lucide-react'
import Image from 'next/image'

interface HeaderProps {
  lastUpdate: Date | null
  isLoading: boolean
  isConnected?: boolean
}

export default function Header({ lastUpdate, isLoading, isConnected = true }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-tecpred-primary via-tecpred-secondary to-tecpred-primary shadow-lg border-b-4 border-tecpred-orange overflow-visible">
      <div className="container mx-auto px-0 py-1 pl-0">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Image
              src="/logo.png"
              alt="TecPred"
              width={480}
              height={152}
              priority
              className="h-40 w-auto brightness-110 contrast-125 drop-shadow-[0_2px_10px_rgba(255,255,255,0.45)]"
            />
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
          <div className="flex items-center space-x-4 pr-6">
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
            
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              isConnected
                ? 'bg-success bg-opacity-20 border-success'
                : 'bg-danger bg-opacity-20 border-danger'
            }`}>
              <div className={`w-3 h-3 rounded-full shadow-lg ${
                isConnected
                  ? 'bg-success animate-pulse-slow shadow-success'
                  : 'bg-danger shadow-danger'
              }`}></div>
              <span className="text-white text-sm font-medium">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
