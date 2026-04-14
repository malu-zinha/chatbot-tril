#!/usr/bin/env node

/**
 * Script de Verificação da Configuração do Dashboard
 * Verifica se todas as variáveis de ambiente estão configuradas
 */

require('dotenv').config({ path: '.env.local' })

console.log('\n🔍 Verificando configuração do Dashboard...\n')

// Verificar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let hasErrors = false

console.log('📋 Checklist de Configuração:\n')

// 1. Verificar SUPABASE_URL
if (!supabaseUrl || supabaseUrl === '') {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL: NÃO CONFIGURADO')
  hasErrors = true
} else if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL: FORMATO INCORRETO')
  console.log(`   Valor atual: ${supabaseUrl}`)
  console.log('   Formato esperado: https://seu-projeto.supabase.co')
  hasErrors = true
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL: Configurado')
  console.log(`   ${supabaseUrl}`)
}

// 2. Verificar SUPABASE_ANON_KEY
if (!supabaseKey || supabaseKey === '') {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: NÃO CONFIGURADO')
  hasErrors = true
} else if (supabaseKey.length < 100) {
  console.log('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY: MUITO CURTO (provavelmente incompleto)')
  console.log(`   Comprimento atual: ${supabaseKey.length} caracteres`)
  console.log('   Comprimento esperado: ~200+ caracteres')
  hasErrors = true
} else {
  console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Configurado')
  console.log(`   ${supabaseKey.substring(0, 30)}... (${supabaseKey.length} caracteres)`)
}

console.log('\n')

if (hasErrors) {
  console.log('❌ CONFIGURAÇÃO INCOMPLETA!\n')
  console.log('📝 Para configurar:\n')
  console.log('1. Abra o arquivo .env.local na pasta dashboard/')
  console.log('2. Acesse https://app.supabase.com')
  console.log('3. Selecione seu projeto')
  console.log('4. Vá em Settings > API')
  console.log('5. Copie "Project URL" e "anon public"')
  console.log('6. Cole no arquivo .env.local\n')
  console.log('Exemplo:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n')
  process.exit(1)
} else {
  console.log('✅ CONFIGURAÇÃO COMPLETA!\n')
  console.log('🚀 Próximos passos:\n')
  console.log('1. Verifique se as views estão criadas no Supabase:')
  console.log('   Execute: supabase/views_dashboard_blocos.sql\n')
  console.log('2. Reinicie o servidor:')
  console.log('   npm run dev\n')
  console.log('3. Acesse: http://localhost:3000\n')
  process.exit(0)
}
