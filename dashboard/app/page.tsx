'use client'

import React, { useState, useEffect } from 'react'
import { 
  Briefcase, 
  CheckCircle, 
  Play, 
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import Header from '../components/Header'
import KPICard from '../components/KPICard'
import ProjetosStatusChart from '../components/ProjetosStatusChart'
import CargaTrabalhoChart from '../components/CargaTrabalhoChart'
import AtrasosTable from '../components/AtrasosTable'
import RetrabalhoCard from '../components/RetrabalhoCard'
import ProjetosTable from '../components/ProjetosTable'
import EngenheirosTable from '../components/EngenheirosTable'
import AreasTable from '../components/AreasTable'
import {
  fetchVisaoGeral,
  fetchAtrasosEngenheiro,
  fetchCargaTrabalho,
  fetchRetrabalhoEngenheiro,
  fetchProjetosStatus,
  subscribeToChanges,
  VisaoGeral,
  AtrasosEngenheiro,
  CargaTrabalho,
  RetrabalhoEngenheiro,
  ProjetosStatus,
} from '../lib/supabase'
import {
  mockVisaoGeral,
  mockAtrasosEngenheiro,
  mockCargaTrabalho,
  mockRetrabalhos,
  mockProjetosStatus,
  mockProjetos,
  mockEngenheiros,
  mockAreas,
} from '../lib/mockData'

export default function Dashboard() {
  const [visaoGeral, setVisaoGeral] = useState<VisaoGeral | null>(null)
  const [atrasosEngenheiro, setAtrasosEngenheiro] = useState<AtrasosEngenheiro[]>([])
  const [cargaTrabalho, setCargaTrabalho] = useState<CargaTrabalho[]>([])
  const [retrabalhos, setRetrabalhos] = useState<RetrabalhoEngenheiro[]>([])
  const [projetosStatus, setProjetosStatus] = useState<ProjetosStatus[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados para modais
  const [showProjetosModal, setShowProjetosModal] = useState(false)
  const [showProjetosConcluidosModal, setShowProjetosConcluidosModal] = useState(false)
  const [showProjetosExecucaoModal, setShowProjetosExecucaoModal] = useState(false)
  const [showAtrasadosModal, setShowAtrasadosModal] = useState(false)
  const [showEngenheirosModal, setShowEngenheirosModal] = useState(false)
  const [showAreasModal, setShowAreasModal] = useState(false)

  // Função para carregar todos os dados
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Verifica se Supabase está configurado
      const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://exemplo.supabase.co'

      if (supabaseConfigured) {
        // Usa dados reais do Supabase
        const [
          visaoGeralData,
          atrasosData,
          cargaData,
          retrabalhosData,
          statusData,
        ] = await Promise.all([
          fetchVisaoGeral(),
          fetchAtrasosEngenheiro(),
          fetchCargaTrabalho(),
          fetchRetrabalhoEngenheiro(),
          fetchProjetosStatus(),
        ])

        setVisaoGeral(visaoGeralData)
        setAtrasosEngenheiro(atrasosData)
        setCargaTrabalho(cargaData)
        setRetrabalhos(retrabalhosData)
        setProjetosStatus(statusData)
      } else {
        // Usa dados mockados para preview
        console.log('⚠️  Usando dados mockados - Configure o Supabase em .env.local')
        setVisaoGeral(mockVisaoGeral)
        setAtrasosEngenheiro(mockAtrasosEngenheiro)
        setCargaTrabalho(mockCargaTrabalho)
        setRetrabalhos(mockRetrabalhos)
        setProjetosStatus(mockProjetosStatus)
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      // Em caso de erro, usa dados mockados
      setVisaoGeral(mockVisaoGeral)
      setAtrasosEngenheiro(mockAtrasosEngenheiro)
      setCargaTrabalho(mockCargaTrabalho)
      setRetrabalhos(mockRetrabalhos)
      setProjetosStatus(mockProjetosStatus)
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    loadData()

    // Configurar subscrições em tempo real (só se Supabase estiver configurado)
    const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://exemplo.supabase.co'

    if (supabaseConfigured) {
      const channels = [
        subscribeToChanges('engenheiros_projetos', loadData),
        subscribeToChanges('projetos_previsao', loadData),
        subscribeToChanges('retrabalho_projetos', loadData),
      ]

      // Cleanup
      return () => {
        channels.forEach(channel => channel.unsubscribe())
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-tecpred-light">
      <Header lastUpdate={lastUpdate} isLoading={isLoading} />

      <main className="container mx-auto px-6 py-8">
        {/* Seção 1: KPIs Principais */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Visão Geral da Produção
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total de Projetos"
              value={visaoGeral?.total_projetos || 0}
              subtitle={`${visaoGeral?.total_areas || 0} áreas`}
              icon={Briefcase}
              color="primary"
              onClick={() => setShowProjetosModal(true)}
            />
            <KPICard
              title="Projetos Concluídos"
              value={visaoGeral?.projetos_concluidos || 0}
              subtitle={`${visaoGeral?.areas_concluidas || 0} áreas concluídas`}
              icon={CheckCircle}
              color="success"
              onClick={() => setShowProjetosConcluidosModal(true)}
            />
            <KPICard
              title="Em Execução"
              value={visaoGeral?.projetos_em_execucao || 0}
              subtitle={`${visaoGeral?.areas_ativas || 0} áreas ativas`}
              icon={Play}
              color="info"
              onClick={() => setShowProjetosExecucaoModal(true)}
            />
            <KPICard
              title="Atrasados"
              value={visaoGeral?.projetos_atrasados || 0}
              subtitle="Requer atenção"
              icon={AlertTriangle}
              color="danger"
              onClick={() => setShowAtrasadosModal(true)}
            />
          </div>
        </section>
        
        {/* Modais */}
        <ProjetosTable
          isOpen={showProjetosModal}
          onClose={() => setShowProjetosModal(false)}
          data={mockProjetos}
          initialFilter="all"
          title="Total de Projetos"
          color="primary"
        />
        <ProjetosTable
          isOpen={showProjetosConcluidosModal}
          onClose={() => setShowProjetosConcluidosModal(false)}
          data={mockProjetos}
          initialFilter="concluido"
          title="Projetos Concluídos"
          color="success"
        />
        <ProjetosTable
          isOpen={showProjetosExecucaoModal}
          onClose={() => setShowProjetosExecucaoModal(false)}
          data={mockProjetos}
          initialFilter="em_execucao"
          title="Em Execução"
          color="info"
        />
        <ProjetosTable
          isOpen={showAtrasadosModal}
          onClose={() => setShowAtrasadosModal(false)}
          data={mockProjetos}
          initialFilter="atrasado"
          title="Atrasados"
          color="danger"
        />
        <EngenheirosTable
          isOpen={showEngenheirosModal}
          onClose={() => setShowEngenheirosModal(false)}
          data={mockEngenheiros}
        />
        <AreasTable
          isOpen={showAreasModal}
          onClose={() => setShowAreasModal(false)}
          data={mockAreas}
        />

        {/* Seção 2: Progresso */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-tecpred-primary" />
              <h3 className="text-lg font-bold text-gray-900">
                Progresso Geral
              </h3>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Percentual Concluído Médio
                  </span>
                  <span className="text-2xl font-bold text-tecpred-primary">
                    {visaoGeral?.percentual_concluido_medio.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-tecpred-primary to-tecpred-secondary h-4 rounded-full transition-all duration-500"
                    style={{ width: `${visaoGeral?.percentual_concluido_medio || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 3: Gráficos */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Análises e Gráficos</h2>
            <button
              onClick={() => setShowAreasModal(true)}
              className="px-4 py-2 bg-tecpred-primary text-white rounded-lg hover:bg-tecpred-secondary transition-colors text-sm"
            >
              Ver Todas as Áreas
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjetosStatusChart data={projetosStatus} />
            <CargaTrabalhoChart data={cargaTrabalho} />
          </div>
        </section>

        {/* Seção 4: Atrasos */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Atrasos</h2>
            <button
              onClick={() => setShowEngenheirosModal(true)}
              className="px-4 py-2 bg-tecpred-primary text-white rounded-lg hover:bg-tecpred-secondary transition-colors text-sm"
            >
              Ver Todos os Engenheiros
            </button>
          </div>
          <AtrasosTable data={atrasosEngenheiro} />
        </section>

        {/* Seção 5: Retrabalhos */}
        <section className="mb-8">
          <RetrabalhoCard data={retrabalhos} />
        </section>

        {/* Footer */}
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>Dashboard TecPred • Atualização em Tempo Real</p>
          <p className="mt-1">
            Desenvolvido com ❤️ para gestão eficiente de projetos
          </p>
        </footer>
      </main>
    </div>
  )
}

