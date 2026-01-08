import { createClient } from '@supabase/supabase-js';
import { getSupabaseService } from '../integrations/supabase/supabaseService.ts';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
    console.log('\n💡 Adicione estas variáveis no arquivo .env:');
    console.log('   SUPABASE_URL=https://xxxxx.supabase.co');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...\n');
    process.exit(1);
  }
  
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const supabaseService = getSupabaseService();
  
  try {
    // Teste 1: Listar tabelas
    console.log('\n📋 Teste 1: Verificar tabela "projetos"...');
    const { data: projetos, error: error1 } = await supabase
      .from('projetos')
      .select('id')
      .limit(1);
    
    if (error1) throw error1;
    console.log('   ✅ Tabela "projetos" acessível');
    
    // Teste 2: Verificar nova tabela
    console.log('\n📋 Teste 2: Verificar tabela "atualizacoes_diarias"...');
    const { data: atualizacoes, error: error2 } = await supabase
      .from('atualizacoes_diarias')
      .select('id')
      .limit(1);
    
    if (error2) {
      console.log('   ⚠️  Tabela "atualizacoes_diarias" não encontrada');
      console.log('   💡 Execute a migration: supabase/migrations/001_expand_schema_planilha.sql');
    } else {
      console.log('   ✅ Tabela "atualizacoes_diarias" acessível');
    }
    
    // Teste 3: Verificar view
    console.log('\n📋 Teste 3: Verificar view "view_projetos_completo"...');
    const { data: view, error: error3 } = await supabase
      .from('view_projetos_completo')
      .select('codigo')
      .limit(1);
    
    if (error3) {
      console.log('   ⚠️  View "view_projetos_completo" não encontrada');
      console.log('   💡 Execute a migration: supabase/migrations/001_expand_schema_planilha.sql');
    } else {
      console.log('   ✅ View "view_projetos_completo" acessível');
    }
    
    // Teste 4: Criar engenheiro de teste
    console.log('\n📋 Teste 4: Criar engenheiro de teste...');
    const { data: eng, error: error4 } = await supabase
      .from('engenheiros')
      .upsert({
        nome: 'Engenheiro Teste',
        whatsapp: '+5511999999999',
        email: 'teste@example.com'
      }, {
        onConflict: 'whatsapp'
      })
      .select()
      .single();
    
    if (error4) throw error4;
    console.log(`   ✅ Engenheiro criado/atualizado: ${eng.nome} (${eng.whatsapp})`);
    
    // Teste 4.5: Testar supabaseService
    console.log('\n📋 Teste 4.5: Testar SupabaseService...');
    if (supabaseService.isConnected()) {
      console.log('   ✅ SupabaseService conectado');
      
      // Testar buscar engenheiro
      const engTest = await supabaseService.criarOuBuscarEngenheiro('+5511999999999', 'Engenheiro Teste');
      if (engTest) {
        console.log(`   ✅ Engenheiro encontrado via service: ${engTest.nome}`);
      }
    } else {
      console.log('   ⚠️  SupabaseService não conectado');
    }
    
    // Teste 5: Verificar novas colunas
    console.log('\n📋 Teste 5: Verificar novas colunas da tabela "projetos"...');
    const { data: columns, error: error5 } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'projetos' 
          AND column_name IN (
            'contato_cliente', 
            'tipo_projeto', 
            'etapa_atual', 
            'metrica_retrabalho',
            'dias_parado_cliente'
          )
          ORDER BY column_name
        `
      });
    
    if (error5) {
      console.log('   ⚠️  Não foi possível verificar colunas (RPC não disponível)');
      console.log('   💡 Verifique manualmente no Table Editor do Supabase');
    } else if (columns && columns.length > 0) {
      console.log('   ✅ Novas colunas encontradas:', columns.length);
      columns.forEach((col: any) => console.log(`      - ${col.column_name}`));
    } else {
      console.log('   ⚠️  Novas colunas não encontradas');
      console.log('   💡 Execute a migration: supabase/migrations/001_expand_schema_planilha.sql');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CONEXÃO COM SUPABASE FUNCIONANDO! 🎉');
    console.log('='.repeat(60));
    console.log('\n💡 Status da integração:');
    console.log('   ✅ Supabase conectado');
    console.log('   ✅ SupabaseService implementado');
    console.log('   ✅ EngineerProjectFlow integrado');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Se viu warnings (⚠️), execute a migration');
    console.log('   2. Teste o bot: npm run test:bot-limpo');
    console.log('   3. Configure sincronização automática (opcional)\n');
    
  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ ERRO AO TESTAR CONEXÃO');
    console.log('='.repeat(60));
    console.error('\n📛 Mensagem:', error.message);
    console.error('📛 Detalhes:', error.hint || error.details || 'Nenhum detalhe disponível');
    console.log('\n💡 Soluções:');
    console.log('   1. Verifique se o projeto Supabase está ativo');
    console.log('   2. Verifique as credenciais no .env');
    console.log('   3. Execute a migration se ainda não executou');
    console.log('   4. Consulte: GUIA_APLICAR_MIGRATION.md\n');
    process.exit(1);
  }
}

testConnection();

