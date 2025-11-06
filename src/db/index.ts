import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Verificar conexão
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Banco de dados conectado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

// Desconectar
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export default prisma;

