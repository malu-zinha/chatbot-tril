// =====================================================
// TESTES: Sistema de Notificações Automáticas
// =====================================================
// Script para testar notificações matinais e noturnas
// =====================================================

import dotenv from 'dotenv';
import { NotificacaoMatinalFlow, NotificacaoNoturnaFlow } from '../chatbot/flows/notificationFlows.ts';
import { getEngineerSheetService } from '../integrations/sheets/engineerSheetService.ts';
import { getCronJobManager } from '../integrations/cron/cronJobs.ts';
import readline from 'readline';

// Carregar variáveis de ambiente
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

// =====================================================
// TESTE 1: Fluxo Matinal
// =====================================================

async function testarFluxoMatinal() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTE 1: Fluxo Matinal');
  console.log('🧪 ========================================\n');

  const flow = new NotificacaoMatinalFlow('+5511999999999', 'PRJ-001');

  console.log('📝 Simulando conversa matinal...\n');

  // Step 1: Início
  let result = await flow.processarMensagem('inicio');
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 2: Escolher status
  const status = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(status);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 3: Escolher previsão
  const previsao = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(previsao);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 4: Confirmar
  const confirmar = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(confirmar);
  console.log('🤖 Bot:', result.mensagem, '\n');
  
  // Debug
  console.log('🔍 Debug - finalizado:', result.finalizado);
  console.log('🔍 Debug - erro:', result.erro || 'nenhum');

  if (result.finalizado) {
    console.log('✅ Fluxo matinal concluído!');
  } else {
    console.log('❌ Fluxo matinal não finalizou corretamente');
    console.log('🔍 Estado atual:', JSON.stringify(result, null, 2));
  }
}

// =====================================================
// TESTE 2: Fluxo Noturno
// =====================================================

async function testarFluxoNoturno() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTE 2: Fluxo Noturno');
  console.log('🧪 ========================================\n');

  const flow = new NotificacaoNoturnaFlow('+5511999999999', 'PRJ-001', 'em execução');

  console.log('📝 Simulando conversa noturna...\n');

  // Step 1: Início
  let result = await flow.processarMensagem('inicio');
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 2: Escolher feito
  const feito = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(feito);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 3: Retrabalho?
  const retrabalho = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(retrabalho);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 4: Motivo (se sim) ou Etapa (se não)
  if (retrabalho === '1') {
    const motivo = await pergunta('💬 Você: ');
    result = await flow.processarMensagem(motivo);
    console.log('🤖 Bot:', result.mensagem, '\n');
  }

  // Step 5: Etapa
  const etapa = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(etapa);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 6: Observações (OBRIGATÓRIO)
  const observacoes = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(observacoes);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Step 7: Confirmar
  const confirmar = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(confirmar);
  console.log('🤖 Bot:', result.mensagem, '\n');

  if (result.finalizado) {
    console.log('✅ Fluxo noturno concluído!');
  } else {
    console.log('❌ Fluxo noturno não finalizou corretamente');
  }
}

// =====================================================
// TESTE 3: Listar Projetos Ativos
// =====================================================

async function testarListagemAtivos() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTE 3: Listagem de Projetos Ativos');
  console.log('🧪 ========================================\n');

  const service = getEngineerSheetService();

  console.log('📊 Buscando projetos ativos...\n');

  const activeProjects = await service.listActiveProjects();

  console.log(`✅ Projetos ativos encontrados: ${activeProjects.length}\n`);

  activeProjects.forEach((project, index) => {
    console.log(`${index + 1}. ${project.codigo} - ${project.cliente}`);
    console.log(`   Obra: ${project.obra}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Etapa: ${project.etapa}\n`);
  });
}

// =====================================================
// TESTE 4: Cron Jobs (Disparo Manual)
// =====================================================

async function testarCronJobs() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTE 4: Cron Jobs (Disparo Manual)');
  console.log('🧪 ========================================\n');

  const cronManager = getCronJobManager();

  console.log('📊 Status dos Cron Jobs:');
  const status = cronManager.getStatus();
  console.log(`   🌅 Matinal: ${status.morning}`);
  console.log(`   🌙 Noturna: ${status.night}\n`);

  console.log('🧪 Escolha o teste:\n');
  console.log('1️⃣ Disparar notificação matinal manualmente');
  console.log('2️⃣ Disparar notificação noturna manualmente');
  console.log('3️⃣ Pular\n');

  const opcao = await pergunta('💬 Você: ');

  if (opcao === '1') {
    await cronManager.triggerMorningNotification();
  } else if (opcao === '2') {
    await cronManager.triggerNightNotification();
  } else {
    console.log('⏭️ Teste de cron jobs pulado');
  }
}

// =====================================================
// TESTE 5: Validação de Campos Obrigatórios
// =====================================================

async function testarValidacaoObrigatoria() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTE 5: Validação de Campos Obrigatórios');
  console.log('🧪 ========================================\n');

  const flow = new NotificacaoNoturnaFlow('+5511999999999', 'PRJ-001', 'em execução');

  console.log('📝 Testando validação de observações obrigatórias...\n');

  // Iniciar fluxo
  let result = await flow.processarMensagem('inicio');
  console.log('🤖 Bot: [Pergunta feito]');

  // Escolher feito
  result = await flow.processarMensagem('1');
  console.log('🤖 Bot: [Pergunta retrabalho]');

  // Sem retrabalho
  result = await flow.processarMensagem('2');
  console.log('🤖 Bot: [Pergunta etapa]');

  // Escolher etapa
  result = await flow.processarMensagem('5');
  console.log('🤖 Bot: [Pergunta observações - OBRIGATÓRIO]');

  // Tentar pular observações (deve falhar)
  console.log('\n🧪 Tentando enviar observação vazia (deve falhar)...');
  result = await flow.processarMensagem('');
  console.log('🤖 Bot:', result.mensagem);

  if (result.mensagem.includes('OBRIGATÓRIAS')) {
    console.log('\n✅ Validação funcionando corretamente!');
  } else {
    console.log('\n❌ Validação NÃO está funcionando!');
  }

  // Tentar com texto muito curto (deve falhar)
  console.log('\n🧪 Tentando enviar observação muito curta (deve falhar)...');
  result = await flow.processarMensagem('abc');
  console.log('🤖 Bot:', result.mensagem);

  if (result.mensagem.includes('OBRIGATÓRIAS') || result.mensagem.includes('5 caracteres')) {
    console.log('\n✅ Validação de tamanho mínimo funcionando!');
  } else {
    console.log('\n❌ Validação de tamanho mínimo NÃO está funcionando!');
  }
}

// =====================================================
// MENU PRINCIPAL
// =====================================================

async function main() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTES: Sistema de Notificações');
  console.log('🧪 ========================================\n');

  console.log('Escolha o teste:\n');
  console.log('1️⃣ Fluxo Matinal (interativo)');
  console.log('2️⃣ Fluxo Noturno (interativo)');
  console.log('3️⃣ Listar Projetos Ativos');
  console.log('4️⃣ Cron Jobs (disparo manual)');
  console.log('5️⃣ Validação de Campos Obrigatórios');
  console.log('6️⃣ Executar TODOS os testes');
  console.log('0️⃣ Sair\n');

  const opcao = await pergunta('💬 Você: ');

  switch (opcao) {
    case '1':
      await testarFluxoMatinal();
      break;
    case '2':
      await testarFluxoNoturno();
      break;
    case '3':
      await testarListagemAtivos();
      break;
    case '4':
      await testarCronJobs();
      break;
    case '5':
      await testarValidacaoObrigatoria();
      break;
    case '6':
      await testarListagemAtivos();
      await testarValidacaoObrigatoria();
      console.log('\n✅ Todos os testes automáticos concluídos!');
      console.log('ℹ️ Testes interativos (1, 2, 4) devem ser executados separadamente');
      break;
    case '0':
      console.log('\n👋 Saindo...');
      rl.close();
      return;
    default:
      console.log('\n❌ Opção inválida');
  }

  rl.close();
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  rl.close();
  process.exit(1);
});

