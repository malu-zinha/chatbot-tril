/**
 * Entry point para o Sheets Bot
 * 
 * Para usar este bot:
 * 1. Configure o .env (veja .env.example)
 * 2. Configure Google Sheets API (veja GUIA-SHEETS-BOT.md)
 * 3. Execute: npm run dev
 */

import dotenv from 'dotenv';
import { startSheetsBot } from './bot/sheetsBot.ts';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🚀 Iniciando Chatbot WhatsApp + Google Sheets...\n');

// Validações básicas
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'GOOGLE_SHEETS_ID',
  'GOOGLE_APPLICATION_CREDENTIALS'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente faltando:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📖 Veja o arquivo .env.example e GUIA-SHEETS-BOT.md\n');
  process.exit(1);
}

// Iniciar bot
startSheetsBot().catch(error => {
  console.error('❌ Erro fatal ao iniciar bot:', error);
  process.exit(1);
});

