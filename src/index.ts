import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './db/index.ts';
import { startBot } from './bot/whatsappBot.ts';

async function main() {
  console.log('🚀 Iniciando sistema de gestão de obras...\n');

  // Conectar ao banco de dados
  await connectDatabase();

  // Iniciar chatbot
  console.log('📱 Iniciando chatbot WhatsApp...\n');
  await startBot();

  // Tratamento de encerramento
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Encerrando aplicação...');
    await disconnectDatabase();
    process.exit(0);
  });
}

main().catch(async (error) => {
  console.error('❌ Erro ao iniciar aplicação:', error);
  await disconnectDatabase();
  process.exit(1);
});

