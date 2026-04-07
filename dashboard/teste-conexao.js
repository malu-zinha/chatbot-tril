/**
 * Script de Teste de Conexão com Supabase
 * 
 * Execute: node teste-conexao.js
 * 
 * Este script verifica:
 * 1. Se as credenciais do Supabase estão configuradas
 * 2. Se as views necessárias existem no banco
 * 3. Se há dados nas tabelas
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verificando configuração do Supabase...\n')

// Verificar credenciais
if (!supabaseUrl || supabaseUrl === 'https://exemplo.supabase.co') {
  console.error('❌ ERRO: NEXT_PUBLIC_SUPABASE_URL não configurada!')
  console.log('📝 Edite o arquivo .env.local e adicione suas credenciais do Supabase\n')
  process.exit(1)
}

if (!supabaseAnonKey || supabaseAnonKey.startsWith('sua_chave')) {
  console.error('❌ ERRO: NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada!')
  console.log('📝 Edite o arquivo .env.local e adicione suas credenciais do Supabase\n')
  process.exit(1)
}

console.log('✅ Credenciais encontradas')
console.log(`📍 URL: ${supabaseUrl}\n`)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testarConexao() {
  console.log('🔌 Testando conexão com o banco de dados...\n')

  try {
    // Lista de views necessárias
    const viewsNecessarias = [
      'vw_bloco1_visao_geral',
      'vw_bloco2_atrasos_engenheiro',
      'vw_bloco2_atrasos_area',
      'vw_bloco3_carga_trabalho',
      'vw_bloco5_retrabalho_engenheiro',
      'vw_grafico_projetos_status',
    ]

    console.log('📊 Verificando views necessárias:\n')

    for (const viewName of viewsNecessarias) {
      const { data, error } = await supabase.from(viewName).select('*').limit(1)

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ View '${viewName}' NÃO EXISTE`)
          console.log(`   Execute o script: supabase/views_dashboard_blocos.sql\n`)
        } else {
          console.log(`⚠️  View '${viewName}': ${error.message}\n`)
        }
      } else {
        console.log(`✅ View '${viewName}' OK`)
      }
    }

    // Testar tabelas principais
    console.log('\n📋 Verificando tabelas principais:\n')

    const tabelas = [
      { nome: 'engenheiros_projetos', descricao: 'Engenheiros' },
      { nome: 'areas_bd', descricao: 'Áreas' },
      { nome: 'projetos_previsao', descricao: 'Projetos' },
      { nome: 'status_bd', descricao: 'Status' },
      { nome: 'complexidade_tarefas', descricao: 'Complexidades' },
    ]

    for (const tabela of tabelas) {
      const { data, error, count } = await supabase
        .from(tabela.nome)
        .select('*', { count: 'exact', head: true })

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Tabela '${tabela.nome}' NÃO EXISTE`)
          console.log(`   Execute o script: supabase/MASTER_SCHEMA_COMPLETO.sql\n`)
        } else {
          console.log(`⚠️  Tabela '${tabela.nome}': ${error.message}\n`)
        }
      } else {
        console.log(`✅ Tabela '${tabela.nome}' (${tabela.descricao}): ${count || 0} registros`)
      }
    }

    // Buscar dados de visão geral
    console.log('\n📈 Testando consulta de dados:\n')

    const { data: visaoGeral, error: errorVisao } = await supabase
      .from('vw_bloco1_visao_geral')
      .select('*')
      .single()

    if (errorVisao) {
      console.log('❌ Erro ao buscar visão geral:', errorVisao.message)
    } else if (visaoGeral) {
      console.log('✅ Dados carregados com sucesso!')
      console.log('\n📊 Resumo do Dashboard:')
      console.log(`   • Total de Projetos: ${visaoGeral.total_projetos || 0}`)
      console.log(`   • Concluídos: ${visaoGeral.projetos_concluidos || 0}`)
      console.log(`   • Em Execução: ${visaoGeral.projetos_em_execucao || 0}`)
      console.log(`   • Atrasados: ${visaoGeral.projetos_atrasados || 0}`)
      console.log(`   • Progresso Médio: ${visaoGeral.percentual_concluido_medio?.toFixed(1) || 0}%`)
    } else {
      console.log('⚠️  Nenhum dado encontrado (banco vazio)')
      console.log('   Insira alguns dados de teste ou use o chatbot para registrar projetos')
    }

    console.log('\n✅ Teste de conexão concluído!\n')
    console.log('📝 Próximos passos:')
    console.log('   1. Se houver views faltando, execute os scripts SQL no Supabase')
    console.log('   2. Se o banco estiver vazio, insira dados de teste')
    console.log('   3. Inicie o dashboard: npm run dev')
    console.log('   4. Acesse: http://localhost:3000\n')
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
  }
}

testarConexao()
