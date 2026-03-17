// =====================================================
// TESTE REAL: Integração com Planilha Google Sheets
// =====================================================
// Testa funcionalidades reais na planilha do Google
// =====================================================

import dotenv from 'dotenv';
import { getEngineerSheetService } from '../integrations/sheets/engineerSheetService.ts';
import { NotificacaoMatinalFlow, NotificacaoNoturnaFlow } from '../chatbot/flows/notificationFlows.ts';
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
// TESTE 1: Listar Projetos Reais
// =====================================================

async function listarProjetosReais() {
  console.log('\n📊 ========================================');
  console.log('📊 TESTE 1: Listar Projetos Reais');
  console.log('📊 ========================================\n');

  const service = getEngineerSheetService();

  try {
    console.log('🔍 Buscando projetos na planilha...\n');
    const projetos = await service.listAllProjects();

    console.log(`✅ Total de projetos encontrados: ${projetos.length}\n`);

    if (projetos.length === 0) {
      console.log('⚠️ Nenhum projeto encontrado na planilha.\n');
      return null;
    }

    projetos.forEach((projeto, index) => {
      console.log(`${index + 1}. ${projeto.codigo || 'N/A'} - ${projeto.cliente || 'N/A'}`);
      console.log(`   Status: ${projeto.status || 'N/A'}`);
      console.log(`   Etapa: ${projeto.etapa || 'N/A'}`);
      console.log(`   Área: ${projeto.area || 'N/A'}`);
      console.log('');
    });

    return projetos;
  } catch (error: any) {
    console.error('❌ Erro ao listar projetos:', error.message);
    return null;
  }
}

// =====================================================
// TESTE 2: Buscar Projeto Específico
// =====================================================

async function buscarProjeto(codigo: string) {
  console.log(`\n🔍 Buscando projeto: ${codigo}...\n`);

  const service = getEngineerSheetService();

  try {
    const projeto = await service.getProject(codigo);

    if (!projeto) {
      console.log('❌ Projeto não encontrado!\n');
      return null;
    }

    console.log('✅ Projeto encontrado:\n');
    console.log('📋 Dados completos:');
    Object.entries(projeto).forEach(([key, value]) => {
      console.log(`   ${key}: ${value || 'N/A'}`);
    });
    console.log('');

    return projeto;
  } catch (error: any) {
    console.error('❌ Erro ao buscar projeto:', error.message);
    return null;
  }
}

// =====================================================
// TESTE 3: Atualização Matinal Real
// =====================================================

async function testarAtualizacaoMatinalReal(codigoProjeto: string) {
  console.log('\n🌅 ========================================');
  console.log('🌅 TESTE 3: Atualização Matinal REAL');
  console.log('🌅 ========================================\n');

  console.log(`📊 Projeto: ${codigoProjeto}\n`);

  // Buscar estado atual
  const service = getEngineerSheetService();
  const projetoAntes = await service.getProject(codigoProjeto);

  if (!projetoAntes) {
    console.log('❌ Projeto não encontrado!\n');
    return;
  }

  console.log('📋 Estado ANTES da atualização:');
  console.log(`   Status: ${projetoAntes['Status do projeto'] || 'N/A'}`);
  console.log(`   Previsão: ${projetoAntes['Previsão para o dia'] || 'N/A'}\n`);

  // Criar fluxo
  const flow = new NotificacaoMatinalFlow('+5511999999999', codigoProjeto);

  // Iniciar fluxo
  let result = await flow.processarMensagem('inicio');
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Escolher status
  console.log('💡 Escolha um status (digite o número):');
  const status = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(status);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Escolher previsão
  console.log('💡 Escolha uma previsão (digite o número):');
  const previsao = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(previsao);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Confirmar
  console.log('💡 Confirma os dados? (1 = Sim, 2 = Não)');
  const confirmar = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(confirmar);
  console.log('🤖 Bot:', result.mensagem, '\n');

  if (result.finalizado) {
    // Buscar estado depois
    console.log('⏳ Aguardando 2 segundos para atualização...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const projetoDepois = await service.getProject(codigoProjeto);

    if (projetoDepois) {
      console.log('📋 Estado DEPOIS da atualização:');
      console.log(`   Status: ${projetoDepois['Status do projeto'] || 'N/A'}`);
      console.log(`   Previsão: ${projetoDepois['Previsão para o dia'] || 'N/A'}\n`);

      if (
        projetoDepois['Status do projeto'] !== projetoAntes['Status do projeto'] ||
        projetoDepois['Previsão para o dia'] !== projetoAntes['Previsão para o dia']
      ) {
        console.log('✅ Atualização realizada com SUCESSO na planilha!\n');
      } else {
        console.log('⚠️ Dados não foram atualizados na planilha.\n');
      }
    }
  } else {
    console.log('❌ Fluxo não foi finalizado.\n');
  }
}

// =====================================================
// TESTE 4: Atualização Noturna Real
// =====================================================

async function testarAtualizacaoNoturnaReal(codigoProjeto: string) {
  console.log('\n🌙 ========================================');
  console.log('🌙 TESTE 4: Atualização Noturna REAL');
  console.log('🌙 ========================================\n');

  console.log(`📊 Projeto: ${codigoProjeto}\n`);

  // Buscar estado atual
  const service = getEngineerSheetService();
  const projetoAntes = await service.getProject(codigoProjeto);

  if (!projetoAntes) {
    console.log('❌ Projeto não encontrado!\n');
    return;
  }

  const statusAtual = projetoAntes['Status do projeto'] || 'em execução';

  console.log('📋 Estado ANTES da atualização:');
  console.log(`   Status: ${statusAtual}`);
  console.log(`   Feito: ${projetoAntes['Feito ao final do dia'] || 'N/A'}`);
  console.log(`   Retrabalho: ${projetoAntes['Necessitou de retrabalho?'] || 'N/A'}`);
  console.log(`   Etapa: ${projetoAntes['Etapa'] || 'N/A'}`);
  console.log(`   Observações: ${projetoAntes['Observações'] || 'N/A'}\n`);

  // Criar fluxo
  const flow = new NotificacaoNoturnaFlow('+5511999999999', codigoProjeto, statusAtual);

  // Iniciar fluxo
  let result = await flow.processarMensagem('inicio');
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Escolher feito
  console.log('💡 Escolha o que foi feito (digite o número):');
  const feito = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(feito);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Retrabalho?
  console.log('💡 Necessitou de retrabalho? (1 = Sim, 2 = Não)');
  const retrabalho = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(retrabalho);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Motivo (se sim)
  if (retrabalho === '1') {
    console.log('💡 Escolha o motivo (digite o número):');
    const motivo = await pergunta('💬 Você: ');
    result = await flow.processarMensagem(motivo);
    console.log('🤖 Bot:', result.mensagem, '\n');
  }

  // Etapa
  console.log('💡 Escolha a etapa (digite o número):');
  const etapa = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(etapa);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Observações (OBRIGATÓRIO)
  console.log('💡 Digite suas observações (mínimo 5 caracteres):');
  const observacoes = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(observacoes);
  console.log('🤖 Bot:', result.mensagem, '\n');

  // Confirmar
  console.log('💡 Confirma os dados? (1 = Sim, 2 = Não)');
  const confirmar = await pergunta('💬 Você: ');
  result = await flow.processarMensagem(confirmar);
  console.log('🤖 Bot:', result.mensagem, '\n');

  if (result.finalizado) {
    // Buscar estado depois
    console.log('⏳ Aguardando 2 segundos para atualização...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const projetoDepois = await service.getProject(codigoProjeto);

    if (projetoDepois) {
      console.log('📋 Estado DEPOIS da atualização:');
      console.log(`   Feito: ${projetoDepois['Feito ao final do dia'] || 'N/A'}`);
      console.log(`   Retrabalho: ${projetoDepois['Necessitou de retrabalho?'] || 'N/A'}`);
      console.log(`   Motivo: ${projetoDepois['motivo da revisão'] || 'N/A'}`);
      console.log(`   Etapa: ${projetoDepois['Etapa'] || 'N/A'}`);
      console.log(`   % Executado: ${projetoDepois['% Executado'] || 'N/A'}`);
      console.log(`   Observações: ${projetoDepois['Observações'] || 'N/A'}\n`);

      const atualizado =
        projetoDepois['Feito ao final do dia'] !== projetoAntes['Feito ao final do dia'] ||
        projetoDepois['Etapa'] !== projetoAntes['Etapa'] ||
        projetoDepois['Observações'] !== projetoAntes['Observações'];

      if (atualizado) {
        console.log('✅ Atualização realizada com SUCESSO na planilha!\n');
      } else {
        console.log('⚠️ Dados não foram atualizados na planilha.\n');
      }
    }
  } else {
    console.log('❌ Fluxo não foi finalizado.\n');
  }
}

// =====================================================
// MENU PRINCIPAL
// =====================================================

async function main() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TESTE REAL: Integração com Planilha');
  console.log('🧪 ========================================\n');

  console.log('⚠️  ATENÇÃO: Este teste vai MODIFICAR a planilha real!\n');

  console.log('Escolha o teste:\n');
  console.log('1️⃣ Listar projetos reais');
  console.log('2️⃣ Buscar projeto específico');
  console.log('3️⃣ Testar atualização matinal REAL');
  console.log('4️⃣ Testar atualização noturna REAL');
  console.log('5️⃣ Executar todos os testes');
  console.log('0️⃣ Sair\n');

  const opcao = await pergunta('💬 Você: ');

  switch (opcao) {
    case '1': {
      await listarProjetosReais();
      break;
    }

    case '2': {
      const codigo = await pergunta('\n💬 Digite o código do projeto (ex: PRJ-001): ');
      await buscarProjeto(codigo.trim());
      break;
    }

    case '3': {
      const codigo = await pergunta('\n💬 Digite o código do projeto (ex: PRJ-001): ');
      await testarAtualizacaoMatinalReal(codigo.trim());
      break;
    }

    case '4': {
      const codigo = await pergunta('\n💬 Digite o código do projeto (ex: PRJ-001): ');
      await testarAtualizacaoNoturnaReal(codigo.trim());
      break;
    }

    case '5': {
      const projetos = await listarProjetosReais();
      if (projetos && projetos.length > 0) {
        const primeiroProjeto = projetos[0];
        const codigo = primeiroProjeto.codigo || 'PRJ-001';
        
        console.log(`\n💡 Usando projeto: ${codigo}\n`);
        
        const continuar = await pergunta('Deseja continuar? (s/n): ');
        if (continuar.toLowerCase() === 's') {
          await testarAtualizacaoMatinalReal(codigo);
          await testarAtualizacaoNoturnaReal(codigo);
        }
      }
      break;
    }

    case '0': {
      console.log('\n👋 Saindo...');
      rl.close();
      return;
    }

    default: {
      console.log('\n❌ Opção inválida');
    }
  }

  rl.close();
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  rl.close();
  process.exit(1);
});

