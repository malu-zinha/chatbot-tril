/**
 * Entry point para o Bot de Gestão de Projetos
 * 
 * Sistema: Supabase (DB) + Google Sheets (visualização) + WhatsApp (interface)
 * 
 * Para usar este bot:
 * 1. Configure o .env (veja .env-opcao-b.example)
 * 2. Configure Google Sheets API e Supabase
 * 3. Execute: npm start
 */

import dotenv from 'dotenv';
import { startSheetsBot } from '../chatbot/handlers/sheetsBot.ts';
import { getCronJobManager } from '../integrations/cron/cronJobs.ts';
import { iniciarSincronizacaoAutomatica } from '../integrations/cron/syncDatabaseToSheets.ts';
import { getWhatsAppService } from '../integrations/whatsapp/whatsappService.ts';
import { getNotificationService } from '../integrations/notifications/notificationService.ts';
import { getNotificationWorker } from '../integrations/notifications/notificationWorker.ts';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🚀 Iniciando Chatbot WhatsApp para Gestão de Projetos...\n');

// Validações básicas - Apenas o essencial para o novo sistema
const requiredEnvVars = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_SHEETS_ENGINEER_ID',
  'GOOGLE_SHEETS_ENGINEER_NAME'
];

const optionalEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias faltando:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📖 Configure o arquivo .env (veja .env-opcao-b.example)\n');
  process.exit(1);
}

// Avisar sobre Supabase (recomendado)
const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptional.length > 0) {
  console.log('⚠️  Supabase não configurado:');
  missingOptional.forEach(varName => console.log(`   - ${varName}`));
  console.log('   ℹ️  O bot funcionará apenas com Google Sheets (sem banco de dados)\n');
}

// Iniciar bot e sistemas
(async () => {
  try {
    // Modo de operação
    const temSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('📋 Modo de operação:');
    if (temSupabase) {
      console.log('   ✅ Supabase (Banco de dados)');
      console.log('   ✅ Google Sheets (Visualização)');
      console.log('   ✅ Sincronização automática a cada 5min\n');
    } else {
      console.log('   ⚠️  Apenas Google Sheets (sem banco de dados)');
      console.log('   ℹ️  Configure Supabase para melhor desempenho\n');
    }
    
    // Iniciar bot WhatsApp
    console.log('📱 Iniciando WhatsApp Bot...');
    await startSheetsBot();
    
    console.log('\n⏰ Iniciando sistema de notificações automáticas...');
    
    // Inicializar WhatsApp Service
    const whatsappService = getWhatsAppService();
    console.log(`   📱 ${whatsappService.getProviderName()}`);
    
    // Inicializar Notification Service e injetar WhatsApp Service
    const notificationService = getNotificationService();
    notificationService.setWhatsAppService(whatsappService);
    
    // Inicializar Notification Worker e injetar WhatsApp Service
    const notificationWorker = getNotificationWorker();
    notificationWorker.setWhatsAppService(whatsappService);
    
    // Iniciar Cron Jobs (notificações + worker)
    const cronManager = getCronJobManager();
    cronManager.start();
    
    // Iniciar sincronização automática Supabase → Google Sheets
    if (temSupabase) {
      console.log('\n🔄 Iniciando sincronização automática (Supabase → Sheets)...');
      iniciarSincronizacaoAutomatica();
    }
    
    console.log('\n✅ Sistema completo iniciado com sucesso!');
    console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp\n');
  } catch (error: any) {
    console.error('❌ Erro fatal ao iniciar sistema:', error);
    process.exit(1);
  }
})();
