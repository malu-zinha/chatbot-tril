import 'dotenv/config';
// Substitui a importação por implementações simples.
// Troque pela lógica real do seu banco (mongoose, pg, prisma, etc.) quando preparar ./db.ts
async function connectDatabase(): Promise<void> {
  console.log('🔌 Conectando ao banco de dados (temporário)...');
  // Exemplo: usar mongoose
  // await mongoose.connect(process.env.MONGO_URI!);
}

async function disconnectDatabase(): Promise<void> {
  console.log('🔌 Desconectando do banco de dados (temporário)...');
  // Exemplo: usar mongoose
  // await mongoose.disconnect();
}
import { startBot } from './bot/whatsappBot';

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

