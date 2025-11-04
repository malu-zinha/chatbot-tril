import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Populando banco de dados...\n');

  // Criar áreas
  const areas = [
    { nome: 'Elétrico', descricao: 'Projetos elétricos' },
    { nome: 'Hidrossanitário', descricao: 'Projetos hidrossanitários' },
    { nome: 'Climatização', descricao: 'Projetos de climatização' },
    { nome: 'Drenagem', descricao: 'Projetos de drenagem' },
    { nome: 'Solar', descricao: 'Projetos de energia solar' },
  ];

  for (const area of areas) {
    await prisma.area.upsert({
      where: { nome: area.nome },
      update: {},
      create: area,
    });
  }
  console.log('✅ Áreas criadas');

  // Criar cliente de exemplo
  const cliente = await prisma.cliente.upsert({
    where: { email: 'cliente@exemplo.com' },
    update: {},
    create: {
      nome: 'Cliente Exemplo',
      email: 'cliente@exemplo.com',
      telefone: '83999999999',
    },
  });
  console.log('✅ Cliente criado');

  // Criar obra de exemplo
  const obra = await prisma.obra.upsert({
    where: { id: 'obra-exemplo' },
    update: {},
    create: {
      id: 'obra-exemplo',
      nome: 'Obra Exemplo 1',
      endereco: 'Rua Exemplo, 123',
      cidade: 'João Pessoa',
      estado: 'PB',
      clienteId: cliente.id,
    },
  });
  console.log('✅ Obra criada');

  console.log('\n🎉 Seed concluído com sucesso!');
}

seed()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

