/**
 * Entry point para o Sheets Bot
 * 
 * Para usar este bot:
 * 1. Configure o .env (veja .env.example)
 * 2. Configure Google Sheets API (veja GUIA-SHEETS-BOT.md)
 * 3. Execute: npm run dev
 */

import dotenv from 'dotenv';
import { startSheetsBot } from '../chatbot/handlers/sheetsBot.ts';
import { getCronJobManager } from '../integrations/cron/cronJobs.ts';
import { iniciarSincronizacaoAutomatica } from '../integrations/cron/syncDatabaseToSheets.ts';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🚀 Iniciando Chatbot WhatsApp + Google Sheets...\n');

// Validações básicas
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'GOOGLE_SHEETS_ID',
  'GOOGLE_APPLICATION_CREDENTIALS'
];

const optionalEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias faltando:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📖 Veja o arquivo .env.example e GUIA-SHEETS-BOT.md\n');
  process.exit(1);
}

// Avisar sobre variáveis opcionais faltando
const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptional.length > 0) {
  console.log('⚠️  Variáveis opcionais não configuradas (necessárias apenas para flows antigos):');
  missingOptional.forEach(varName => console.log(`   - ${varName}`));
  console.log('   ℹ️  O novo fluxo de engenheiros funciona sem essas variáveis\n');
}

// Iniciar bot e cron jobs
(async () => {
  try {
    // Iniciar bot WhatsApp
    await startSheetsBot();
    
    console.log('\n⏰ Iniciando sistema de notificações automáticas...\n');
    
    // Iniciar Cron Jobs (notificações)
    const cronManager = getCronJobManager();
    cronManager.start();
    
    // Iniciar sincronização automática Supabase → Google Sheets
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n🔄 Iniciando sincronização automática (Supabase → Sheets)...\n');
      iniciarSincronizacaoAutomatica();
    } else {
      console.log('\n⚠️  Sincronização automática desabilitada (Supabase não configurado)\n');
    }
    
    console.log('\n✅ Sistema completo iniciado com sucesso!\n');
  } catch (error: any) {
    console.error('❌ Erro fatal ao iniciar sistema:', error);
    process.exit(1);
  }
})();
