'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { BarChart2, CheckCircle, Clock, AlertTriangle, Activity } from 'lucide-react'

import Header from './Header'
import KPICard from './KPICard'
import AtrasosTable from './AtrasosTable'
import CargaTrabalhoChart from './CargaTrabalhoChart'
import ProjetosStatusChart from './ProjetosStatusChart'
import RetrabalhoCard from './RetrabalhoCard'
import ProjetosTable from './ProjetosTable'
import RetrabalhoDetalhesModal from './RetrabalhoDetalhesModal'

import {
  fetchVisaoGeral,
  fetchAtrasosEngenheiro,
  fetchAtrasosArea,
  fetchCargaTrabalho,
  fetchRetrabalhoEngenheiro,
  fetchProjetosStatus,
  fetchProjetos,
  subscribeToChanges,
  VisaoGeral,
  AtrasosEngenheiro,
  CargaTrabalho,
  RetrabalhoEngenheiro,
  ProjetosStatus,
} from '../lib/supabase'

export default function DashboardClient() {
  const [visaoGeral, setVisaoGeral] = useState<VisaoGeral | null>(null)
  const [atrasosEngenheiro, setAtrasosEngenheiro] = useState<AtrasosEngenheiro[]>([])
  const [cargaTrabalho, setCargaTrabalho] = useState<CargaTrabalho[]>([])
  const [retrabalhoEngenheiro, setRetrabalhoEngenheiro] = useState<RetrabalhoEngenheiro[]>([])
  const [projetosStatus, setProjetosStatus] = useState<ProjetosStatus[]>([])
  const [projetos, setProjetos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Projetos modal state
  const [projetosModalOpen, setProjetosModalOpen] = useState(false)
  const [projetosModalFilter, setProjetosModalFilter] = useState<'all' | 'concluido' | 'em_execucao' | 'atrasado'>('all')
  const [projetosModalTitle, setProjetosModalTitle] = useState('Listagem de Projetos')
  const [projetosModalColor, setProjetosModalColor] = useState<'primary' | 'success' | 'info' | 'danger' | 'warning'>('primary')

  // Retrabalho modal state
  const [retrabalhoModalOpen, setRetrabalhoModalOpen] = useState(false)
  const [selectedProjeto, setSelectedProjeto] = useState<{ projeto_id: string; codigo_projeto: string; cliente: string } | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [vg, ae, ct, re, ps, proj] = await Promise.all([
        fetchVisaoGeral(),
        fetchAtrasosEngenheiro(),
        fetchCargaTrabalho(),
        fetchRetrabalhoEngenheiro(),
        fetchProjetosStatus(),
        fetchProjetos(),
      ])

      setVisaoGeral(vg)
      setAtrasosEngenheiro(ae)
      setCargaTrabalho(ct)
      setRetrabalhoEngenheiro(re)
      setProjetosStatus(ps)
      setProjetos(proj)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Subscribe to realtime changes
    const tables = [
      'projetos',
      'areas',
      'engenheiros',
      'retrabalhos',
    ]

    const channels = tables.map((table) =>
      subscribeToChanges(table, () => {
        loadData()
      })
    )

    return () => {
      channels.forEach((channel) => channel.unsubscribe())
    }
  }, [loadData])

  const openProjetosModal = (
    filter: 'all' | 'concluido' | 'em_execucao' | 'atrasado',
    title: string,
    color: 'primary' | 'success' | 'info' | 'danger' | 'warning'
  ) => {
    setProjetosModalFilter(filter)
    setProjetosModalTitle(title)
    setProjetosModalColor(color)
    setProjetosModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header lastUpdate={lastUpdate} isLoading={isLoading} />

      <main className="container mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            className="cursor-pointer"
            onClick={() => openProjetosModal('all', 'Todos os Projetos', 'primary')}
          >
            <KPICard
              title="Total de Projetos"
              value={visaoGeral?.total_projetos ?? '—'}
              subtitle="Clique para ver todos"
              icon={BarChart2}
              color="primary"
            />
          </div>

          <div
            className="cursor-pointer"
            onClick={() => openProjetosModal('concluido', 'Projetos Concluídos', 'success')}
          >
            <KPICard
              title="Projetos Concluídos"
              value={visaoGeral?.projetos_concluidos ?? '—'}
              subtitle={
                visaoGeral
                  ? `${((visaoGeral.projetos_concluidos / visaoGeral.total_projetos) * 100).toFixed(1)}% do total`
                  : undefined
              }
              icon={CheckCircle}
              color="success"
            />
          </div>

          <div
            className="cursor-pointer"
            onClick={() => openProjetosModal('em_execucao', 'Projetos em Execução', 'info')}
          >
            <KPICard
              title="Em Execução"
              value={visaoGeral?.projetos_em_execucao ?? '—'}
              subtitle="Projetos ativos"
              icon={Clock}
              color="info"
            />
          </div>

          <div
            className="cursor-pointer"
            onClick={() => openProjetosModal('atrasado', 'Projetos Atrasados', 'danger')}
          >
            <KPICard
              title="Projetos Atrasados"
              value={visaoGeral?.projetos_atrasados ?? '—'}
              subtitle="Requerem atenção"
              icon={AlertTriangle}
              color="danger"
            />
          </div>
        </div>

        {/* Secondary KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Conclusão Média"
            value={visaoGeral ? `${visaoGeral.percentual_concluido_medio.toFixed(1)}%` : '—'}
            subtitle="Percentual médio de conclusão"
            icon={Activity}
            color="primary"
          />
          <KPICard
            title="Total de Áreas"
            value={visaoGeral?.total_areas ?? '—'}
            subtitle={visaoGeral ? `${visaoGeral.areas_concluidas} concluídas` : undefined}
            icon={CheckCircle}
            color="success"
          />
          <KPICard
            title="Áreas Ativas"
            value={visaoGeral?.areas_ativas ?? '—'}
            subtitle="Em andamento"
            icon={Clock}
            color="info"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProjetosStatusChart data={projetosStatus} />
          <CargaTrabalhoChart data={cargaTrabalho} />
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AtrasosTable data={atrasosEngenheiro} />
          <RetrabalhoCard
            data={retrabalhoEngenheiro}
            onSelectProjeto={(id) => {
              const proj = projetos.find((p) => p.projeto_id === id)
              if (proj) {
                setSelectedProjeto({
                  projeto_id: proj.projeto_id,
                  codigo_projeto: proj.codigo_projeto,
                  cliente: proj.cliente,
                })
                setRetrabalhoModalOpen(true)
              }
            }}
          />
        </div>
      </main>

      {/* Projetos Modal */}
      <ProjetosTable
        isOpen={projetosModalOpen}
        onClose={() => setProjetosModalOpen(false)}
        data={projetos}
        initialFilter={projetosModalFilter}
        title={projetosModalTitle}
        color={projetosModalColor}
      />

      {/* Retrabalho Detalhes Modal */}
      <RetrabalhoDetalhesModal
        isOpen={retrabalhoModalOpen}
        onClose={() => setRetrabalhoModalOpen(false)}
        projetoCodigo={selectedProjeto?.codigo_projeto}
        cliente={selectedProjeto?.cliente}
      />
    </div>
  )
}
