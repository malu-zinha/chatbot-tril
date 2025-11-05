import { startBot } from './bot/whatsappBot.js';
import dotenv from 'dotenv';

// Configurar ambiente
dotenv.config();

console.log('=================================');
console.log('🏗️  BOT WHATSAPP - GESTÃO DE OBRAS');
console.log('=================================');
console.log('📱 Iniciando conexão com WhatsApp...');
console.log('🤖 IA OpenAI integrada e pronta');
console.log('=================================');

// Iniciar bot com tratamento de erro
try {
  await startBot();
  console.log('✅ Bot iniciado com sucesso!');
} catch (error) {
  console.error('❌ Falha ao iniciar bot:', error);
  process.exit(1);
}