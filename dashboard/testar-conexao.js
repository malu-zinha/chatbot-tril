#!/usr/bin/env node

/**
 * Script de Teste de Conexão com Supabase
 * Verifica se consegue conectar e se as views existem
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('\n🔌 Testando conexão com Supabase...\n')

const supabase = createClient(supabaseUrl, supabaseKey)

// Lista de views necessárias
const requiredViews = [
  'vw_bloco1_visao_geral',
  'vw_bloco2_atrasos_engenheiro',
  'vw_bloco3_carga_trabalho',
  'vw_bloco5_retrabalho_engenheiro',
  'vw_grafico_projetos_status',
  'vw_projetos_detalhado'
]

// Lista de tabelas necessárias
const requiredTables = [
  'engenheiros',
  'projetos',
  'areas',
  'engenheiros_projetos'
]

async function testarConexao() {
  try {
    console.log('📊 Verificando views necessárias:\n')
    
    let viewsOk = 0
    let viewsFaltando = []
    
    for (const view of requiredViews) {
      try {
        const { data, error } = await supabase
          .from(view)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${view}: NÃO EXISTE`)
          viewsFaltando.push(view)
        } else {
          console.log(`✅ ${view}: OK`)
          viewsOk++
        }
      } catch (e) {
        console.log(`❌ ${view}: ERRO (${e.message})`)
        viewsFaltando.push(view)
      }
    }
    
    console.log('\n📋 Verificando tabelas principais:\n')
    
    let tabelasOk = 0
    let tabelasFaltando = []
    
    for (const table of requiredTables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ ${table}: NÃO EXISTE`)
          tabelasFaltando.push(table)
        } else {
          console.log(`✅ ${table}: OK (${count || 0} registros)`)
          tabelasOk++
        }
      } catch (e) {
        console.log(`❌ ${table}: ERRO (${e.message})`)
        tabelasFaltando.push(table)
      }
    }
    
    console.log('\n')
    console.log('━'.repeat(60))
    console.log('\n📊 RESUMO:\n')
    console.log(`✅ Views OK: ${viewsOk}/${requiredViews.length}`)
    console.log(`✅ Tabelas OK: ${tabelasOk}/${requiredTables.length}`)
    
    if (viewsFaltando.length > 0 || tabelasFaltando.length > 0) {
      console.log('\n❌ AÇÃO NECESSÁRIA:\n')
      
      if (tabelasFaltando.length > 0) {
        console.log('🔧 Tabelas faltando - Execute no Supabase SQL Editor:')
        console.log('   1. supabase/MASTER_SCHEMA_COMPLETO.sql')
        console.log('   2. supabase/seed_areas_completo.sql')
        console.log('   3. supabase/seed_status_detalhado.sql\n')
      }
      
      if (viewsFaltando.length > 0) {
        console.log('🔧 Views faltando - Execute no Supabase SQL Editor:')
        console.log('   supabase/views_dashboard_blocos.sql\n')
      }
      
      console.log('📍 Onde executar:')
      console.log('   https://app.supabase.com → SQL Editor\n')
      
      process.exit(1)
    } else {
      console.log('\n✅ TUDO PRONTO!\n')
      console.log('🚀 O dashboard deve funcionar perfeitamente!')
      console.log('   Acesse: http://localhost:3000\n')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO DE CONEXÃO:\n')
    console.error(error.message)
    console.log('\n🔧 Verifique:')
    console.log('1. URL do Supabase está correta no .env.local')
    console.log('2. Chave anon está correta no .env.local')
    console.log('3. Projeto está ativo no Supabase\n')
    process.exit(1)
  }
}

testarConexao()
