// Edge Function para processar prompts do chatbot
// Caminho: supabase/functions/processar-prompt/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PromptRequest {
  eng_id: string
  prompt: string
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializa Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request
    const { eng_id, prompt, metadata = {} }: PromptRequest = await req.json()

    if (!eng_id || !prompt) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'eng_id e prompt são obrigatórios'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Analisa o prompt e determina a ação
    const acao = analisarPrompt(prompt)

    let resultado: any

    switch (acao.tipo) {
      case 'CADASTRAR_ENGENHEIRO':
        resultado = await cadastrarEngenheiro(supabaseClient, acao.parametros)
        break

      case 'CRIAR_PROJETO':
        resultado = await criarProjeto(supabaseClient, acao.parametros)
        break

      case 'ATRIBUIR_AREA':
        resultado = await atribuirArea(supabaseClient, eng_id, acao.parametros)
        break

      case 'ATUALIZAR_STATUS':
        resultado = await atualizarStatus(supabaseClient, acao.parametros)
        break

      case 'ATUALIZAR_PREVISAO':
        resultado = await atualizarPrevisao(supabaseClient, acao.parametros)
        break

      case 'BUSCAR_PROJETOS':
        resultado = await buscarProjetos(supabaseClient, eng_id)
        break

      case 'LISTAR_AREAS':
        resultado = await listarAreas(supabaseClient)
        break

      case 'REGISTRAR_RETRABALHO':
        resultado = await registrarRetrabalho(supabaseClient, acao.parametros)
        break

      default:
        resultado = {
          sucesso: false,
          mensagem: 'Não entendi o que você quer fazer. Pode reformular?',
          sugestoes: [
            'Cadastrar novo engenheiro',
            'Criar projeto',
            'Atribuir área a projeto',
            'Atualizar status',
            'Ver meus projetos'
          ]
        }
    }

    // Registra log
    await supabaseClient
      .from('chatbot_logs')
      .insert({
        eng_id,
        prompt_original: prompt,
        acao_executada: acao.tipo,
        sucesso: resultado.sucesso,
        mensagem_retorno: JSON.stringify(resultado),
        metadata: { ...metadata, parametros: acao.parametros }
      })

    return new Response(
      JSON.stringify(resultado),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: `Erro ao processar: ${error.message}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function analisarPrompt(prompt: string): { tipo: string, parametros: any } {
  const p = prompt.toLowerCase().trim()

  // Cadastrar engenheiro
  if (p.includes('cadastr') || p.includes('registr') || p.includes('meu nome')) {
    const nome = extrairNome(prompt)
    const exclusivo = p.includes('exclusiv') || p.includes('só') || p.includes('somente')
    return {
      tipo: 'CADASTRAR_ENGENHEIRO',
      parametros: { nome, exclusivo }
    }
  }

  // Criar projeto
  if ((p.includes('criar') || p.includes('novo')) && (p.includes('projeto') || p.includes('obra'))) {
    const codigo = extrairCodigo(prompt)
    const cliente = extrairCliente(prompt)
    return {
      tipo: 'CRIAR_PROJETO',
      parametros: { codigo, cliente }
    }
  }

  // Atribuir área
  if (p.includes('trabalhar') || p.includes('área') || p.includes('pegar') || p.includes('assumir')) {
    const area = extrairArea(prompt)
    const projeto = extrairCodigo(prompt)
    const dataInicio = extrairData(prompt, 'inicio')
    const dataPrevista = extrairData(prompt, 'previsao')
    return {
      tipo: 'ATRIBUIR_AREA',
      parametros: { area, projeto, dataInicio, dataPrevista }
    }
  }

  // Atualizar status
  if (p.includes('status') || p.includes('mudar') || p.includes('atualizar')) {
    const status = extrairStatus(prompt)
    return {
      tipo: 'ATUALIZAR_STATUS',
      parametros: { status }
    }
  }

  // Atualizar previsão
  if (p.includes('previsão') || p.includes('previsao') || p.includes('vou terminar')) {
    const data = extrairData(prompt, 'previsao')
    return {
      tipo: 'ATUALIZAR_PREVISAO',
      parametros: { data }
    }
  }

  // Buscar projetos
  if (p.includes('meus projetos') || p.includes('minhas obras') || p.includes('o que estou')) {
    return {
      tipo: 'BUSCAR_PROJETOS',
      parametros: {}
    }
  }

  // Listar áreas
  if (p.includes('quais áreas') || p.includes('listar areas') || p.includes('áreas disponíveis')) {
    return {
      tipo: 'LISTAR_AREAS',
      parametros: {}
    }
  }

  // Retrabalho
  if (p.includes('retrabalho') || p.includes('refazer') || p.includes('erro')) {
    const motivo = extrairMotivo(prompt)
    return {
      tipo: 'REGISTRAR_RETRABALHO',
      parametros: { motivo }
    }
  }

  return { tipo: 'DESCONHECIDO', parametros: {} }
}

// Funções de extração
function extrairNome(prompt: string): string {
  const match = prompt.match(/(?:nome|sou|chamo)\s+(?:é|eh)?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i)
  return match ? match[1].trim() : ''
}

function extrairCodigo(prompt: string): string {
  const match = prompt.match(/(?:PRJ|projeto|código|codigo)\s*[-:]?\s*([A-Z0-9\-]+)/i)
  return match ? match[1].toUpperCase() : ''
}

function extrairCliente(prompt: string): string {
  const match = prompt.match(/(?:cliente|para)\s+(?:o|a)?\s*([A-ZÀ-Ú][^,.\n]+)/i)
  return match ? match[1].trim() : ''
}

function extrairArea(prompt: string): string {
  const areas: Record<string, string> = {
    'eletric': 'ELETRICO',
    'hidraul': 'HIDRAULICO',
    'estrutur': 'ESTRUTURAL',
    'climatiz': 'CLIMATIZACAO',
    'incendio': 'PREVENCAO_INCENDIO',
    'gas': 'GAS',
    'telefon': 'TELEFONIA',
    'dados': 'TELEFONIA',
    'spda': 'SPDA',
    'para-raio': 'SPDA',
    'automação': 'AUTOMACAO',
    'automacao': 'AUTOMACAO'
  }

  const p = prompt.toLowerCase()
  for (const [key, value] of Object.entries(areas)) {
    if (p.includes(key)) {
      return value
    }
  }
  return ''
}

function extrairStatus(prompt: string): string {
  const status: Record<string, string> = {
    'aguardando': 'AGUARDANDO_INICIO',
    'planejamento': 'EM_PLANEJAMENTO',
    'documentacao': 'DOCUMENTACAO',
    'documentação': 'DOCUMENTACAO',
    'preliminar': 'SERVICOS_PRELIM',
    'infraestrutura': 'SERVICOS_PRELIM',
    'grosso': 'INSTALACOES_GROSSO',
    'primeira fase': 'INSTALACOES_GROSSO',
    'detalhamento': 'DETALHAMENTO',
    'acabamento': 'INSTALACOES_ACABAMENTO',
    'segunda fase': 'INSTALACOES_ACABAMENTO',
    'revisao': 'REVISAO_INTERNA',
    'revisão': 'REVISAO_INTERNA',
    'enviado': 'ENVIADO_CLIENTE',
    'aprovacao': 'EM_APROVACAO',
    'aprovação': 'EM_APROVACAO',
    'concluido': 'CONCLUIDO',
    'concluído': 'CONCLUIDO',
    'terminado': 'CONCLUIDO'
  }

  const p = prompt.toLowerCase()
  for (const [key, value] of Object.entries(status)) {
    if (p.includes(key)) {
      return value
    }
  }
  return 'AGUARDANDO_INICIO'
}

function extrairData(prompt: string, tipo: 'inicio' | 'previsao'): string {
  // Formato DD/MM ou DD/MM/YYYY
  const match = prompt.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/)
  if (match) {
    const dia = match[1].padStart(2, '0')
    const mes = match[2].padStart(2, '0')
    const ano = match[3] || new Date().getFullYear()
    return `${ano}-${mes}-${dia}`
  }
  
  // "amanhã", "hoje"
  if (prompt.toLowerCase().includes('amanhã') || prompt.toLowerCase().includes('amanha')) {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    return amanha.toISOString().split('T')[0]
  }
  
  if (prompt.toLowerCase().includes('hoje')) {
    return new Date().toISOString().split('T')[0]
  }

  return new Date().toISOString().split('T')[0]
}

function extrairMotivo(prompt: string): string {
  const match = prompt.match(/(?:motivo|porque|razão|razao):?\s*([^.]+)/i)
  return match ? match[1].trim() : 'Não especificado'
}

// =====================================================
// FUNÇÕES DE BANCO DE DADOS
// =====================================================

async function cadastrarEngenheiro(supabase: any, params: any) {
  const { data, error } = await supabase.rpc('cadastrar_engenheiro', {
    p_nome: params.nome,
    p_exclusivo: params.exclusivo
  })

  if (error) throw error
  return data
}

async function criarProjeto(supabase: any, params: any) {
  const { data, error } = await supabase.rpc('criar_projeto', {
    p_codigo: params.codigo,
    p_cliente: params.cliente
  })

  if (error) throw error
  return data
}

async function atribuirArea(supabase: any, eng_id: string, params: any) {
  // Primeiro busca o projeto_id pelo código
  const { data: projeto } = await supabase
    .from('projetos')
    .select('projeto_id')
    .eq('codigo_projeto', params.projeto)
    .single()

  if (!projeto) {
    return {
      sucesso: false,
      mensagem: `Projeto ${params.projeto} não encontrado`
    }
  }

  const { data, error } = await supabase.rpc('atribuir_area_projeto', {
    p_eng_id: eng_id,
    p_projeto_id: projeto.projeto_id,
    p_area_codigo: params.area,
    p_data_inicio: params.dataInicio,
    p_data_prevista: params.dataPrevista
  })

  if (error) throw error
  return data
}

async function atualizarStatus(supabase: any, params: any) {
  // Aqui seria necessário saber qual atribuição atualizar
  // Poderia ser a mais recente ou perguntar ao usuário
  return {
    sucesso: false,
    mensagem: 'Função em desenvolvimento: especifique qual projeto/área'
  }
}

async function atualizarPrevisao(supabase: any, params: any) {
  return {
    sucesso: false,
    mensagem: 'Função em desenvolvimento: especifique qual projeto/área'
  }
}

async function buscarProjetos(supabase: any, eng_id: string) {
  const { data, error } = await supabase.rpc('buscar_meus_projetos', {
    p_eng_id: eng_id
  })

  if (error) throw error
  return {
    sucesso: true,
    projetos: data
  }
}

async function listarAreas(supabase: any) {
  const { data, error } = await supabase.rpc('listar_areas_disponiveis')

  if (error) throw error
  return {
    sucesso: true,
    areas: data
  }
}

async function registrarRetrabalho(supabase: any, params: any) {
  return {
    sucesso: false,
    mensagem: 'Função em desenvolvimento: especifique qual projeto/área'
  }
}




