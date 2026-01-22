// Dados mockados para preview do dashboard
// Use apenas para desenvolvimento/demonstração

export const mockVisaoGeral = {
  total_projetos: 25,
  projetos_concluidos: 8,
  projetos_em_execucao: 15,
  projetos_atrasados: 2,
  percentual_concluido_medio: 67.5,
  total_areas: 45,
  areas_concluidas: 18,
  areas_ativas: 27,
}

export const mockAtrasosEngenheiro = [
  {
    eng_id: '1',
    engenheiro: 'João Silva',
    qtde_projetos_atrasados: 2,
    qtde_areas_atrasadas: 3,
    dias_medios_atraso: 12.5,
    atraso_maximo_dias: 25,
  },
  {
    eng_id: '2',
    engenheiro: 'Maria Santos',
    qtde_projetos_atrasados: 1,
    qtde_areas_atrasadas: 2,
    dias_medios_atraso: 8.0,
    atraso_maximo_dias: 15,
  },
]

export const mockCargaTrabalho = [
  {
    eng_id: '1',
    engenheiro: 'João Silva',
    exclusivo: true,
    dias_estimados_totais: 45,
    percentual_execucao_media: 65.0,
    dias_restantes: 16,
    areas_ativas: 5,
    projetos_ativos: 3,
  },
  {
    eng_id: '2',
    engenheiro: 'Maria Santos',
    exclusivo: false,
    dias_estimados_totais: 38,
    percentual_execucao_media: 72.0,
    dias_restantes: 11,
    areas_ativas: 4,
    projetos_ativos: 2,
  },
  {
    eng_id: '3',
    engenheiro: 'Carlos Oliveira',
    exclusivo: true,
    dias_estimados_totais: 52,
    percentual_execucao_media: 58.0,
    dias_restantes: 22,
    areas_ativas: 6,
    projetos_ativos: 4,
  },
]

export const mockRetrabalhos = [
  {
    eng_id: '1',
    engenheiro: 'João Silva',
    qtde_areas_retrabalho: 2,
    total_retrabalhos: 5,
    retrabalho_medio_percentual: 12.5,
    projetos_com_retrabalho: 2,
  },
  {
    eng_id: '2',
    engenheiro: 'Maria Santos',
    qtde_areas_retrabalho: 1,
    total_retrabalhos: 2,
    retrabalho_medio_percentual: 8.0,
    projetos_com_retrabalho: 1,
  },
]

export const mockProjetosStatus = [
  {
    status: 'Concluído',
    quantidade: 8,
    percentual: 32.0,
  },
  {
    status: 'Em Andamento',
    quantidade: 15,
    percentual: 60.0,
  },
  {
    status: 'Atrasado',
    quantidade: 2,
    percentual: 8.0,
  },
]

export const mockProjetos = [
  {
    projeto_id: '1',
    codigo_projeto: 'PRJ-001',
    cliente: 'Cliente ABC',
    descricao: 'Projeto de instalação elétrica',
    engenheiro_nome: 'João Silva',
    area_descricao: 'Elétrico',
    status_descricao: 'Em Andamento',
    percentual_andamento: 65.0,
    data_inicio: '2024-01-15',
    data_prevista: '2024-03-15',
    data_conclusao: null,
    dias_atraso: 0,
  },
  {
    projeto_id: '2',
    codigo_projeto: 'PRJ-002',
    cliente: 'Cliente XYZ',
    descricao: 'Projeto hidráulico completo',
    engenheiro_nome: 'Maria Santos',
    area_descricao: 'Hidráulico',
    status_descricao: 'Concluído',
    percentual_andamento: 100.0,
    data_inicio: '2024-01-10',
    data_prevista: '2024-02-28',
    data_conclusao: '2024-02-25',
    dias_atraso: 0,
  },
  {
    projeto_id: '3',
    codigo_projeto: 'PRJ-003',
    cliente: 'Cliente DEF',
    descricao: 'Estrutural - Fundações',
    engenheiro_nome: 'Carlos Oliveira',
    area_descricao: 'Estrutural',
    status_descricao: 'Atrasado',
    percentual_andamento: 45.0,
    data_inicio: '2024-02-01',
    data_prevista: '2024-03-20',
    data_conclusao: null,
    dias_atraso: 12,
  },
]

export const mockEngenheiros = [
  {
    eng_id: '1',
    nome: 'João Silva',
    exclusivo: true,
    total_projetos: 8,
    areas_ativas: 5,
    media_percentual: 72.5,
    total_retrabalhos: 3,
    dias_trabalho_pendentes: 25,
    areas_atrasadas: 2,
  },
  {
    eng_id: '2',
    nome: 'Maria Santos',
    exclusivo: false,
    total_projetos: 6,
    areas_ativas: 4,
    media_percentual: 85.0,
    total_retrabalhos: 1,
    dias_trabalho_pendentes: 18,
    areas_atrasadas: 0,
  },
  {
    eng_id: '3',
    nome: 'Carlos Oliveira',
    exclusivo: true,
    total_projetos: 10,
    areas_ativas: 7,
    media_percentual: 58.0,
    total_retrabalhos: 5,
    dias_trabalho_pendentes: 35,
    areas_atrasadas: 3,
  },
]

export const mockAreas = [
  {
    area_id: 1,
    codigo: 'ELETRICO',
    descricao: 'Elétrico',
    tempo_trabalho_dias: 15,
    total_projetos: 8,
    areas_ativas: 5,
    areas_concluidas: 3,
    percentual_conclusao: 37.5,
  },
  {
    area_id: 2,
    codigo: 'HIDRAULICO',
    descricao: 'Hidráulico',
    tempo_trabalho_dias: 12,
    total_projetos: 6,
    areas_ativas: 3,
    areas_concluidas: 3,
    percentual_conclusao: 50.0,
  },
  {
    area_id: 3,
    codigo: 'ESTRUTURAL',
    descricao: 'Estrutural',
    tempo_trabalho_dias: 20,
    total_projetos: 5,
    areas_ativas: 4,
    areas_concluidas: 1,
    percentual_conclusao: 20.0,
  },
]

