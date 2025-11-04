import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import { ProjetoService } from '../services/projetoService';
import { ObraModel } from '../models/obra';

const client = new Client({});

// Estados dos usuários
const userStates = new Map<string, any>();

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para parsear dados em campos (formato: "Campo: Valor, Campo2: Valor2")
function parseDataFields(dados: string): Array<{ nome: string; valor: string }> {
  if (!dados || dados.trim() === '') return [];
  
  try {
    // Tentar parsear JSON primeiro
    const jsonData = JSON.parse(dados);
    return Object.entries(jsonData).map(([nome, valor]) => ({ nome, valor: String(valor) }));
  } catch {
    // Se não for JSON, parsear como texto separado por vírgula
    return dados.split(',').map(campo => {
      const [nome, ...valorParts] = campo.split(':');
      return {
        nome: nome?.trim() || 'Campo',
        valor: valorParts.join(':').trim() || ''
      };
    }).filter(c => c.nome && c.valor);
  }
}

// Função para formatar dados para exibição
function formatDataDisplay(dados: string): string {
  if (!dados || dados.trim() === '') return 'Nenhum dado cadastrado';
  
  const campos = parseDataFields(dados);
  if (campos.length === 0) return dados;
  
  return campos.map((c: { nome: string; valor: string }) => `• ${c.nome}: ${c.valor}`).join('\n');
}

// QR Code para autenticação
client.on('qr', (qr: string) => {
  qrcode.generate(qr, { small: true });
});

// Conexão estabelecida
client.on('ready', () => {
  console.log('✅ WhatsApp conectado!');
});

// Lógica do chatbot
client.on('message', async (msg) => {
  if (!msg.from.endsWith('@c.us')) return;

  const userId = msg.from;
  const userState = userStates.get(userId) || { step: null };
  const chat = await msg.getChat();

  try {
    // Menu inicial
    if (msg.body.match(/(menu|oi|olá|ola|bom dia|boa tarde|boa noite)/i)) {
      userStates.set(userId, { step: 'obra' });
      
      await chat.sendStateTyping();
      await delay(1000);

      const contact = await msg.getContact();
      const name = contact.pushname;

      const obras = await ObraModel.listarTodas();
      
      let mensagem = `Olá ${name}! 👋\n\nSelecione a obra:\n\n`;
      obras.forEach((obra, index) => {
        mensagem += `${index + 1} - ${obra.nome}\n`;
      });

      await client.sendMessage(msg.from, mensagem);
      return;
    }

    // Escolha da obra
    if (userState.step === 'obra') {
      const obraIndex = parseInt(msg.body) - 1;
      const obras = await ObraModel.listarTodas();

      if (obraIndex >= 0 && obraIndex < obras.length) {
        const obra = obras[obraIndex];
        userStates.set(userId, { step: 'area', obraId: obra.id, obraNome: obra.nome });

        await delay(1000);
        await chat.sendStateTyping();
        await delay(1000);

        const areas = ['Elétrico', 'Hidrossanitário', 'Climatização', 'Drenagem', 'Solar'];
        let mensagem = `📋 *${obra.nome}*\n\nSelecione a área:\n\n`;
        areas.forEach((area, index) => {
          mensagem += `${index + 1} - ${area}\n`;
        });

        await client.sendMessage(msg.from, mensagem);
      }
      return;
    }

    // Escolha da área
    if (userState.step === 'area' && userState.obraId) {
      const areas = ['Elétrico', 'Hidrossanitário', 'Climatização', 'Drenagem', 'Solar'];
      const areaIndex = parseInt(msg.body) - 1;

      if (areaIndex >= 0 && areaIndex < areas.length) {
        const areaNome = areas[areaIndex];
        const contact = await msg.getContact();
        const nome = contact.pushname;

        // Buscar ou criar projeto
        let projeto = await ProjetoService.buscarProjeto(userState.obraId, areaNome);
        
        if (!projeto) {
          projeto = await ProjetoService.criarProjeto(userState.obraId, areaNome);
        }

        // Registrar visualização
        await ProjetoService.visualizarProjeto(projeto.id, userId, nome);

        await chat.sendStateTyping();
        await delay(1000);

        if (projeto.dados) {
          // Projeto já tem dados - mostrar opções
          const mensagem = `📊 *${userState.obraNome} - ${areaNome}*\n\n` +
            `O que deseja fazer?\n\n` +
            `1️⃣ - Editar dados\n` +
            `2️⃣ - Visualizar dados\n` +
            `3️⃣ - Voltar ao menu`;
          
          await client.sendMessage(msg.from, mensagem);
          userStates.set(userId, { 
            step: 'escolher_acao', 
            projetoId: projeto.id,
            obraNome: userState.obraNome,
            areaNome,
            dadosAtuais: projeto.dados
          });
        } else {
          // Projeto novo - pedir para cadastrar
          await client.sendMessage(
            msg.from,
            `✅ *${userState.obraNome} - ${areaNome}*\n\n` +
            `Ainda não há dados cadastrados.\n\n` +
            `Digite os campos e valores (ex: Tubulação: 100m, Válvulas: 5):`
          );
          userStates.set(userId, { 
            step: 'cadastrar', 
            projetoId: projeto.id,
            obraNome: userState.obraNome,
            areaNome 
          });
        }
      }
      return;
    }

    // Escolher ação (editar, visualizar ou voltar)
    if (userState.step === 'escolher_acao' && userState.projetoId) {
      const escolha = msg.body.trim();
      
      if (escolha === '1') {
        // Editar - mostrar campos disponíveis
        const campos = parseDataFields(userState.dadosAtuais);
        let mensagem = `✏️ *Editar Dados*\n\n`;
        
        if (campos.length > 0) {
          mensagem += `Campos atuais:\n\n`;
          campos.forEach((campo, index) => {
            mensagem += `${index + 1} - ${campo.nome}: ${campo.valor}\n`;
          });
          mensagem += `\n0 - Editar todos os campos\n`;
          mensagem += `\nEscolha o número do campo que deseja editar:`;
          
          userStates.set(userId, { 
            ...userState, 
            step: 'escolher_campo',
            campos 
          });
        } else {
          mensagem = `Digite os novos dados (ex: Tubulação: 100m, Válvulas: 5):`;
          userStates.set(userId, { ...userState, step: 'atualizar_todos' });
        }
        
        await client.sendMessage(msg.from, mensagem);
      } else if (escolha === '2') {
        // Visualizar
        const mensagem = `📋 *Dados do Projeto*\n\n` +
          `${userState.obraNome} - ${userState.areaNome}\n\n` +
          `${formatDataDisplay(userState.dadosAtuais)}\n\n` +
          `Digite "menu" para voltar.`;
        
        await client.sendMessage(msg.from, mensagem);
        userStates.delete(userId);
      } else if (escolha === '3' || msg.body.toLowerCase().includes('menu')) {
        // Voltar ao menu
        userStates.delete(userId);
        await client.sendMessage(msg.from, 'Digite "menu" para iniciar novamente.');
      } else {
        await client.sendMessage(msg.from, 'Opção inválida. Digite 1, 2 ou 3.');
      }
      return;
    }

    // Escolher campo específico para editar
    if (userState.step === 'escolher_campo' && userState.projetoId) {
      const escolha = parseInt(msg.body.trim());
      
      if (escolha === 0) {
        // Editar todos os campos
        await client.sendMessage(msg.from, 'Digite todos os novos dados (ex: Tubulação: 100m, Válvulas: 5):');
        userStates.set(userId, { ...userState, step: 'atualizar_todos' });
      } else if (escolha > 0 && escolha <= userState.campos.length) {
        // Editar campo específico
        const campoSelecionado = userState.campos[escolha - 1];
        await client.sendMessage(
          msg.from,
          `✏️ Editando: *${campoSelecionado.nome}*\n\nValor atual: ${campoSelecionado.valor}\n\nDigite o novo valor:`
        );
        userStates.set(userId, { 
          ...userState, 
          step: 'atualizar_campo',
          campoIndex: escolha - 1
        });
      } else {
        await client.sendMessage(msg.from, 'Opção inválida. Digite um número válido.');
      }
      return;
    }

    // Atualizar campo específico
    if (userState.step === 'atualizar_campo' && userState.projetoId) {
      const contact = await msg.getContact();
      const nome = contact.pushname;
      
      // Atualizar apenas o campo selecionado
      const campos = userState.campos;
      campos[userState.campoIndex].valor = msg.body.trim();
      
      // Reconstruir os dados
      const novosDados = campos.map((c: { nome: string; valor: string }) => `${c.nome}: ${c.valor}`).join(', ');
      
      await ProjetoService.atualizarDados(userState.projetoId, novosDados, userId, nome);
      
      await client.sendMessage(
        msg.from,
        `✅ Campo *${campos[userState.campoIndex].nome}* atualizado com sucesso!\n\nDigite "menu" para voltar.`
      );
      userStates.delete(userId);
      return;
    }

    // Atualizar todos os campos
    if (userState.step === 'atualizar_todos' && userState.projetoId) {
      const contact = await msg.getContact();
      const nome = contact.pushname;

      await ProjetoService.atualizarDados(userState.projetoId, msg.body, userId, nome);
      
      await client.sendMessage(msg.from, '✅ Dados atualizados com sucesso!\n\nDigite "menu" para voltar.');
      userStates.delete(userId);
      return;
    }

    // Cadastrar dados (primeira vez)
    if (userState.step === 'cadastrar' && userState.projetoId) {
      const contact = await msg.getContact();
      const nome = contact.pushname;

      await ProjetoService.atualizarDados(userState.projetoId, msg.body, userId, nome);
      
      await client.sendMessage(
        msg.from,
        `✅ Dados cadastrados com sucesso!\n\n` +
        `📊 *${userState.obraNome} - ${userState.areaNome}*\n\n` +
        `${formatDataDisplay(msg.body)}\n\n` +
        `Digite "menu" para voltar.`
      );
      userStates.delete(userId);
      return;
    }

  } catch (error: any) {
    console.error('Erro no chatbot:', error);
    await client.sendMessage(msg.from, '❌ Erro ao processar. Digite "menu" para tentar novamente.');
    userStates.delete(userId);
  }
});

export async function startBot() {
  await client.initialize();
}

export { client };

