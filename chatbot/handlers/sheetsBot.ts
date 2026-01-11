import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import { WhisperService } from './whisperService.ts';
import { messageHandler } from './messageHandler.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ARCHIVED: Componentes de IA (para reativar no futuro, descomente abaixo):
// import { getGoogleSheetsService } from '../../integrations/sheets/googleSheetsService.ts';
// import { QueryService } from './_archived/queryService.ts';
// import { CommandService } from './_archived/commandService.ts';
// import { SheetSyncService } from '../../integrations/sheets/sheetSyncService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({});

// Configuração da planilha (será carregado depois do dotenv.config())
let SPREADSHEET_ID = '';
let SHEET_RANGE = 'A1:Z1000';
let ENGINEER_SHEET_NAME = 'Engenheiro';
let EVANDRO_SHEET_NAME = 'Evandro';

// Nova planilha de engenheiros (modelo completo)
let ENGINEER_NEW_SPREADSHEET_ID = '';
let ENGINEER_NEW_SHEET_NAME = 'Engenheiro(a)';
let ENGINEER_NEW_RANGE = 'A1:AE1000';

// ARCHIVED: Cache e confirmações (para reativar QueryService/CommandService):
// let cachedSheetData: any[] = [];
// let cachedHeaders: string[] = [];
// let lastUpdate = 0;
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
// const pendingConfirmations = new Map<string, any>();

// Diretório temporário para áudios
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ARCHIVED: Função de cache (para reativar QueryService/CommandService):
/*
async function updateSheetCache() {
  try {
    const now = Date.now();
    if (now - lastUpdate < CACHE_TTL && cachedSheetData.length > 0) {
      return;
    }

    const sheetsService = getGoogleSheetsService();
    const fullRange = `${ENGINEER_SHEET_NAME}!${SHEET_RANGE}`;
    const data = await sheetsService.readSheetAsObjects(SPREADSHEET_ID, fullRange);
    const { headers } = await sheetsService.readSheet(SPREADSHEET_ID, fullRange);
    
    cachedSheetData = data;
    cachedHeaders = headers;
    lastUpdate = now;
    
    console.log(`✅ Cache atualizado: ${data.length} registros (aba ${ENGINEER_SHEET_NAME})`);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar cache da planilha:', error.message);
  }
}
*/

/**
 * Processa áudio e retorna transcrição
 */
async function processAudio(media: any, userId: string): Promise<string> {
  const audioPath = path.join(TEMP_DIR, `${userId}_${Date.now()}.ogg`);
  
  try {
    // Salvar áudio
    const buffer = Buffer.from(media.data, 'base64');
    fs.writeFileSync(audioPath, buffer);
    
    // Transcrever
    const transcription = await WhisperService.transcribe(audioPath);
    
    // Limpar arquivo
    fs.unlinkSync(audioPath);
    
    return transcription;
  } catch (error: any) {
    // Limpar arquivo em caso de erro
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    throw error;
  }
}

// ARCHIVED: Funções de processamento de IA (para reativar QueryService/CommandService):
/*
async function processQuestion(question: string): Promise<string> {
  try {
    // Atualizar cache se necessário
    await updateSheetCache();
    
    if (cachedSheetData.length === 0) {
      return '❌ Não consegui acessar a planilha. Verifique se está configurada corretamente.';
    }

    // Usar query otimizada para planilhas grandes
    const result = cachedSheetData.length > 100
      ? await QueryService.querySheetOptimized(question, cachedSheetData, cachedHeaders)
      : await QueryService.querySheet(question, cachedSheetData, cachedHeaders);

    return result.answer;
  } catch (error: any) {
    console.error('Erro ao processar pergunta:', error.message);
    return '❌ Desculpe, houve um erro ao processar sua pergunta. Tente novamente.';
  }
}

async function processCommand(command: string, userId: string): Promise<string> {
  try {
    // Atualizar cache
    await updateSheetCache();

    if (cachedSheetData.length === 0) {
      return '❌ Não consegui acessar a planilha.';
    }

    // Interpretar comando
    const intent = await CommandService.parseCommand(command, cachedHeaders);

    // Validar comando
    const validation = CommandService.validateCommand(intent);
    if (!validation.valid) {
      return validation.error || '❌ Comando inválido';
    }

    // Processar por tipo de ação
    if (intent.action === 'update') {
      return await handleUpdateCommand(intent, userId);
    } else if (intent.action === 'add') {
      return await handleAddCommand(intent, userId);
    } else if (intent.action === 'delete') {
      return '❌ Remoção de projetos não está habilitada por segurança.\n\nPara remover, edite diretamente no Google Sheets.';
    }

    return '❌ Ação não suportada';

  } catch (error: any) {
    console.error('Erro ao processar comando:', error.message);
    return '❌ Erro ao processar comando. Tente novamente.';
  }
}

// Processa comando de atualização
async function handleUpdateCommand(intent: any, userId: string): Promise<string> {
  try {
    // Gerar preview
    const preview = await CommandService.generatePreview(
      SPREADSHEET_ID,
      ENGINEER_SHEET_NAME,
      intent,
      SHEET_RANGE
    );

    if (!preview) {
      return `❌ Projeto ${intent.projectId} não encontrado.`;
    }

    if (preview.changes.length === 0) {
      return '❌ Nenhuma mudança detectada. Os valores já estão corretos.';
    }

    // Salvar pending confirmation
    pendingConfirmations.set(userId, {
      type: 'update',
      intent,
      preview,
      timestamp: Date.now()
    });

    // Retornar mensagem de confirmação
    return CommandService.formatPreviewMessage(preview);

  } catch (error: any) {
    console.error('Erro ao processar update:', error.message);
    return '❌ Erro ao preparar atualização.';
  }
}

// Processa comando de adição de projeto
async function handleAddCommand(intent: any, userId: string): Promise<string> {
  try {
    // Gerar próximo ID
    const nextId = await CommandService.generateNextProjectId(
      SPREADSHEET_ID,
      ENGINEER_SHEET_NAME,
      SHEET_RANGE
    );

    // Adicionar ID aos dados
    const projectData = { 'Nº': nextId, ...intent.fields };

    // Salvar pending confirmation
    pendingConfirmations.set(userId, {
      type: 'add',
      projectData,
      timestamp: Date.now()
    });

    // Formatar preview
    let message = `📝 *Confirme a criação do novo projeto:*\n\n`;
    message += `🆔 *ID:* ${nextId}\n\n`;
    message += `*Dados:*\n`;
    
    for (const [field, value] of Object.entries(projectData)) {
      message += `• ${field}: *${value}*\n`;
    }

    message += `\n*Será criado em:*\n`;
    message += `✅ Aba Engenheiro\n`;
    message += `✅ Aba Evandro\n`;
    message += `\n_Responda "sim" ou "confirmar" para executar_\n`;
    message += `_Responda "não" ou "cancelar" para desistir_`;

    return message;

  } catch (error: any) {
    console.error('Erro ao processar add:', error.message);
    return '❌ Erro ao preparar criação de projeto.';
  }
}

// Executa comando após confirmação
async function executeConfirmedCommand(userId: string): Promise<string> {
  try {
    const pending = pendingConfirmations.get(userId);
    
    if (!pending) {
      return '❌ Nenhum comando pendente para confirmar.';
    }

    // Limpar confirmação pendente
    pendingConfirmations.delete(userId);

    // Executar por tipo
    if (pending.type === 'update') {
      return await executeUpdate(pending);
    } else if (pending.type === 'add') {
      return await executeAdd(pending);
    }

    return '❌ Tipo de comando desconhecido';

  } catch (error: any) {
    console.error('Erro ao executar comando:', error.message);
    return '❌ Erro ao executar comando.';
  }
}

// Executa atualização confirmada
async function executeUpdate(pending: any): Promise<string> {
  try {
    const { intent, preview } = pending;
    const sheetsService = getGoogleSheetsService();

    // Atualizar aba Engenheiro
    const engineerSuccess = await sheetsService.updateRowByID(
      SPREADSHEET_ID,
      ENGINEER_SHEET_NAME,
      intent.projectId,
      intent.fields,
      SHEET_RANGE
    );

    if (!engineerSuccess) {
      return '❌ Erro ao atualizar aba Engenheiro.';
    }

    // Sincronizar com aba Evandro
    const syncResult = await SheetSyncService.syncProjectToEvandro(
      SPREADSHEET_ID,
      intent.projectId,
      ENGINEER_SHEET_NAME,
      EVANDRO_SHEET_NAME,
      SHEET_RANGE
    );

    // Forçar atualização do cache
    lastUpdate = 0;
    await updateSheetCache();

    // Formatar resposta
    let message = `✅ *Atualização concluída com sucesso!*\n\n`;
    message += `🔹 *Projeto:* ${preview.projectId}\n`;
    message += `📊 *Aba Engenheiro:* Atualizada\n`;
    
    if (syncResult.success) {
      message += `🔄 *Aba Evandro:* Sincronizada\n`;
      message += `📝 *Campos sincronizados:* ${syncResult.syncedFields.join(', ')}`;
    } else {
      message += `⚠️ *Aba Evandro:* Erro na sincronização\n`;
      message += `_Erros: ${syncResult.errors.join(', ')}_`;
    }

    return message;

  } catch (error: any) {
    console.error('Erro ao executar update:', error.message);
    return '❌ Erro ao executar atualização.';
  }
}

// Executa adição confirmada
async function executeAdd(pending: any): Promise<string> {
  try {
    const { projectData } = pending;

    // Criar projeto em ambas as abas
    const result = await SheetSyncService.createProjectInBothSheets(
      SPREADSHEET_ID,
      projectData,
      ENGINEER_SHEET_NAME,
      EVANDRO_SHEET_NAME
    );

    // Forçar atualização do cache
    lastUpdate = 0;
    await updateSheetCache();

    if (result.success) {
      let message = `✅ *Projeto criado com sucesso!*\n\n`;
      message += `🆔 *ID:* ${result.projectId}\n`;
      message += `📊 *Aba Engenheiro:* Criado\n`;
      message += `🔄 *Aba Evandro:* Criado`;
      return message;
    } else {
      return `❌ Erro ao criar projeto:\n${result.errors.join('\n')}`;
    }

  } catch (error: any) {
    console.error('Erro ao executar add:', error.message);
    return '❌ Erro ao criar projeto.';
  }
}

// Cancela comando pendente
function cancelPendingCommand(userId: string): string {
  const pending = pendingConfirmations.get(userId);
  
  if (!pending) {
    return '❌ Nenhum comando pendente para cancelar.';
  }

  pendingConfirmations.delete(userId);
  return '✅ Comando cancelado.';
}
*/

// FIM DO BLOCO ARCHIVED

// QR Code para autenticação
client.on('qr', (qr: string) => {
  console.log('📱 Escaneie o QR Code:');
  qrcode.generate(qr, { small: true });
});

// Conexão estabelecida
client.on('ready', async () => {
  console.log('✅ WhatsApp conectado!');
  
  // ARCHIVED: Cache periódico (reativar se usar QueryService/CommandService):
  // console.log('📊 Carregando dados da planilha...');
  // await updateSheetCache();
  // setInterval(updateSheetCache, CACHE_TTL);
});

// =====================================================
// LISTENERS ADICIONAIS PARA DEBUG
// =====================================================

// Listener para mensagens criadas (pode capturar antes do 'message')
client.on('message_create', async (msg) => {
  const numeroProblema = '5583988990772';
  const numeroProblema2 = '98899';
  const isNumeroProblema = msg.from.includes(numeroProblema) || msg.from.includes(numeroProblema2);
  
  if (isNumeroProblema) {
    console.log(`\n${'🟢'.repeat(30)}`);
    console.log(`🟢🟢🟢 MESSAGE_CREATE DO NÚMERO PROBLEMÁTICO! 🟢🟢🟢`);
    console.log(`   De: ${msg.from}`);
    console.log(`   Body: "${msg.body || '(sem texto)'}"`);
    console.log(`${'🟢'.repeat(30)}\n`);
  }
});

// Listener para mensagens recebidas (evento alternativo)
client.on('message_received', async (msg) => {
  const numeroProblema = '5583988990772';
  const numeroProblema2 = '98899';
  const isNumeroProblema = msg.from.includes(numeroProblema) || msg.from.includes(numeroProblema2);
  
  if (isNumeroProblema) {
    console.log(`\n${'🟡'.repeat(30)}`);
    console.log(`🟡🟡🟡 MESSAGE_RECEIVED DO NÚMERO PROBLEMÁTICO! 🟡🟡🟡`);
    console.log(`   De: ${msg.from}`);
    console.log(`   Body: "${msg.body || '(sem texto)'}"`);
    console.log(`${'🟡'.repeat(30)}\n`);
  }
});

// Listener para erros de autenticação
client.on('auth_failure', (msg) => {
  console.error('\n❌❌❌ FALHA DE AUTENTICAÇÃO DO WHATSAPP! ❌❌❌');
  console.error(`   Mensagem: ${msg}\n`);
});

// Listener para desconexão
client.on('disconnected', (reason) => {
  console.error('\n❌❌❌ WHATSAPP DESCONECTADO! ❌❌❌');
  console.error(`   Motivo: ${reason}\n`);
});

// Listener para mudanças de estado
client.on('change_state', (state) => {
  console.log(`\n📊 Mudança de estado do WhatsApp: ${state}\n`);
});

// LISTENER UNIVERSAL: Captura TODAS as mensagens (antes de qualquer filtro)
client.on('message', async (msg) => {
  // LOG ABSOLUTAMENTE TODAS AS MENSAGENS - SEM FILTROS
  const numeroProblema = '5583988990772';
  const numeroProblema2 = '98899';
  const isNumeroProblema = msg.from.includes(numeroProblema) || msg.from.includes(numeroProblema2);
  
  if (isNumeroProblema) {
    console.log(`\n${'🔴'.repeat(30)}`);
    console.log(`🔴🔴🔴 MENSAGEM DO NÚMERO PROBLEMÁTICO DETECTADA! 🔴🔴🔴`);
    console.log(`${'🔴'.repeat(30)}\n`);
  }
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📨 MENSAGEM RECEBIDA (LISTENER UNIVERSAL)`);
  console.log(`   De: ${msg.from}`);
  console.log(`   Tipo: ${msg.type}`);
  console.log(`   FromMe: ${msg.fromMe}`);
  console.log(`   Body: "${msg.body || '(sem texto)'}"`);
  console.log(`   Timestamp: ${msg.timestamp}`);
  console.log(`   ID: ${msg.id}`);
  
  if (isNumeroProblema) {
    console.log(`\n   🔴 DETALHES DO NÚMERO PROBLEMÁTICO:`);
    console.log(`   Formato completo: ${msg.from}`);
    console.log(`   Contém 98899: ${msg.from.includes('98899')}`);
    console.log(`   Contém 5583988990772: ${msg.from.includes('5583988990772')}`);
    console.log(`   Termina com @c.us: ${msg.from.endsWith('@c.us')}`);
    console.log(`   Termina com @g.us: ${msg.from.endsWith('@g.us')}`);
    console.log(`   É mensagem própria: ${msg.fromMe}`);
    console.log(`   Tipo de mensagem: ${msg.type}`);
    console.log(`   Conteúdo: "${msg.body || '(vazio)'}"`);
  }
  
  console.log(`${'─'.repeat(60)}`);
  
  // Ignorar mensagens do próprio bot
  if (msg.fromMe) {
    console.log('⏭️ Ignorando: mensagem enviada pelo próprio bot\n');
    return;
  }
  
  // Ignorar grupos e status
  // WhatsApp Web pode usar @c.us (contato) ou @lid (Linked Device ID) para mensagens individuais
  const isMensagemIndividual = msg.from.endsWith('@c.us') || msg.from.endsWith('@lid');
  const isMensagemGrupo = msg.from.endsWith('@g.us');
  
  if (!isMensagemIndividual) {
    if (isMensagemGrupo) {
      console.log('⏭️ Ignorando: mensagem de grupo\n');
    } else {
      console.log(`⏭️ Ignorando: formato desconhecido (${msg.from})\n`);
    }
    return;
  }
  
  // Log para @lid (formato especial)
  if (msg.from.endsWith('@lid')) {
    console.log('   ℹ️ Mensagem individual com formato @lid (Linked Device ID)');
    console.log('   ℹ️ Tentando obter número real do contato...');
  }
  
  // Para mensagens com @lid, precisamos obter o número real do contato
  let userId = msg.from;
  let userName = 'usuário';
  
  // Tentar obter nome e número do contato
  try {
    const contact = await msg.getContact();
    userName = contact.pushname || contact.name || 'usuário';
    
    // Se for @lid, usar o número real do contato
    if (msg.from.endsWith('@lid') && contact.number) {
      const numeroLimpo = contact.number.replace(/[^\d]/g, '');
      userId = `${numeroLimpo}@c.us`;
      console.log(`   ✅ Número real obtido: ${userId}`);
      console.log(`   Nome do contato: ${userName}`);
    } else {
      console.log(`👤 Contato: ${userName} (${contact.number || 'sem número'})`);
    }
  } catch (error: any) {
    console.log('⚠️ Não foi possível obter contato, usando ID original');
    if (msg.from.endsWith('@lid')) {
      console.log('   ⚠️ ATENÇÃO: Mensagem @lid sem número do contato pode não funcionar corretamente');
    }
  }
  
  // DEBUG ESPECÍFICO: Verificar se passou pelos filtros
  if (userId.includes(numeroProblema) || userId.includes('98899') || msg.from.includes(numeroProblema) || msg.from.includes('98899')) {
    console.log(`   ✅✅✅ NÚMERO PROBLEMÁTICO PASSOU PELOS FILTROS! ✅✅✅`);
    console.log(`   userId final: ${userId}`);
    console.log(`   Prosseguindo com processamento...`);
  }

  try {
    // Comandos de texto
    if (msg.type === 'chat') {
      // TODAS as mensagens passam pelo messageHandler (garantir consistência)
      console.log(`💬 Mensagem de texto: "${msg.body}"`);
      
      // ARCHIVED: Comandos de cache e confirmação (reativar se usar IA):
      /*
      const body = msg.body.toLowerCase();
      
      if (body.match(/(atualizar|refresh|reload)/)) {
        await client.sendMessage(msg.from, '🔄 Atualizando dados...');
        lastUpdate = 0;
        await updateSheetCache();
        await client.sendMessage(msg.from, `✅ Dados atualizados! ${cachedSheetData.length} registros.`);
        return;
      }

      if (pendingConfirmations.has(userId)) {
        if (body.match(/(sim|confirmar|confirma|ok|yes)/)) {
          await client.sendMessage(msg.from, '⏳ Executando...');
          const result = await executeConfirmedCommand(userId);
          await client.sendMessage(msg.from, result);
          return;
        }
        
        if (body.match(/(não|nao|cancelar|cancela|no)/)) {
          const result = cancelPendingCommand(userId);
          await client.sendMessage(msg.from, result);
          return;
        }

        await client.sendMessage(msg.from, '⚠️ Comando pendente. Responda "sim" ou "não".');
        return;
      }
      */

      // Processar via messageHandler (TODAS as mensagens)
      console.log('🔄 Processando via messageHandler...');
      
      // DEBUG ESPECÍFICO: Número problemático
      const numeroProblema = '5583988990772';
      const isNumeroProblema = userId.includes(numeroProblema) || userId.includes('98899');
      
      if (isNumeroProblema) {
        console.log(`   🔴🔴🔴 PROCESSANDO NÚMERO PROBLEMÁTICO! 🔴🔴🔴`);
        console.log(`   userId original: ${userId}`);
        console.log(`   msg.body: "${msg.body}"`);
      }
      
      try {
        const handlerResponse = await messageHandler.processarMensagem(userId, msg.body);
        
        if (isNumeroProblema) {
          console.log(`   ✅ Resposta gerada para número problemático!`);
          console.log(`   Tamanho da resposta: ${handlerResponse.resposta.length} chars`);
          console.log(`   Primeiros 100 chars: ${handlerResponse.resposta.substring(0, 100)}...`);
        }
        
        console.log(`✅ Resposta gerada (${handlerResponse.resposta.length} chars)`);
        console.log(`📤 Enviando resposta para ${userId}...`);
        
        await client.sendMessage(msg.from, handlerResponse.resposta);
        
        if (isNumeroProblema) {
          console.log(`   ✅✅✅ RESPOSTA ENVIADA COM SUCESSO PARA NÚMERO PROBLEMÁTICO! ✅✅✅`);
        }
        
        console.log(`✅ Resposta enviada com sucesso!\n`);
        return;
      } catch (error: any) {
        if (isNumeroProblema) {
          console.error(`   🔴🔴🔴 ERRO AO PROCESSAR NÚMERO PROBLEMÁTICO! 🔴🔴🔴`);
          console.error(`   Erro: ${error.message}`);
          console.error(`   Stack: ${error.stack}`);
        }
        throw error; // Re-throw para ser capturado pelo catch externo
      }
      
      // ARCHIVED: Fallback de IA (reativar se quiser QueryService/CommandService):
      /*
      if (handlerResponse.resposta && !handlerResponse.resposta.includes('não entendi')) {
        console.log('✅ Processado via messageHandler');
        await client.sendMessage(msg.from, handlerResponse.resposta);
        return;
      }

      console.log('⚠️ Usando fallback de IA...');
      await client.sendMessage(msg.from, '🤖 Analisando...');
      const classification = await QueryService.classifyIntent(msg.body);

      if (classification.type === 'command') {
        const result = await processCommand(msg.body, userId);
        await client.sendMessage(msg.from, result);
      } else {
        const answer = await processQuestion(msg.body);
        await client.sendMessage(msg.from, answer);
      }
      return;
      */
    }

    // Processar áudio
    if (msg.type === 'ptt' || msg.type === 'audio') {
      await client.sendMessage(msg.from, '🎤 Transcrevendo áudio...');
      
      const media = await msg.downloadMedia();
      if (!media) {
        await client.sendMessage(msg.from, '❌ Não consegui baixar o áudio.');
        return;
      }

      const transcription = await processAudio(media, userId);
      
      if (!transcription || transcription.length < 5) {
        await client.sendMessage(msg.from, '❌ Áudio muito curto ou não compreendido.');
        return;
      }

      await client.sendMessage(msg.from, `📝 Você disse: _"${transcription}"_`);
      
      const handlerResponse = await messageHandler.processarMensagem(userId, transcription);
        await client.sendMessage(msg.from, handlerResponse.resposta);
      return;
    }

    // Outros tipos de mensagem
    await client.sendMessage(msg.from, '❌ Só consigo processar texto ou áudio. Digite "menu" para ajuda.');

  } catch (error: any) {
    // DEBUG ESPECÍFICO: Número problemático
    const numeroProblema = '5583988990772';
    const isNumeroProblema = userId.includes(numeroProblema) || userId.includes('98899');
    
    if (isNumeroProblema) {
      console.error('\n🔴🔴🔴 ERRO NO PROCESSAMENTO DO NÚMERO PROBLEMÁTICO! 🔴🔴🔴');
    }
    
    console.error('\n❌ ERRO NO PROCESSAMENTO:');
    console.error(`   Usuário: ${userId}`);
    console.error(`   Mensagem: "${msg.body}"`);
    console.error(`   Erro: ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    
    if (isNumeroProblema) {
      console.error(`   🔴 Tentando enviar mensagem de erro para número problemático...`);
    }
    
    try {
      await client.sendMessage(msg.from, '❌ Desculpe, ocorreu um erro. Tente novamente ou digite "menu" para ajuda.');
      
      if (isNumeroProblema) {
        console.error(`   ✅✅✅ MENSAGEM DE ERRO ENVIADA PARA NÚMERO PROBLEMÁTICO! ✅✅✅`);
      }
      
      console.log('✅ Mensagem de erro enviada ao usuário\n');
    } catch (sendError: any) {
      if (isNumeroProblema) {
        console.error(`   🔴🔴🔴 FALHA AO ENVIAR MENSAGEM DE ERRO PARA NÚMERO PROBLEMÁTICO! 🔴🔴🔴`);
        console.error(`   Erro de envio: ${sendError.message}`);
        console.error(`   Stack: ${sendError.stack}`);
      }
      console.error('❌ Falha ao enviar mensagem de erro:', sendError.message, '\n');
    }
  }
});

export async function startSheetsBot() {
  console.log('🚀 Iniciando Sheets Bot...');
  
  // Carregar configurações do .env (agora sim!)
  SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '';
  SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'A1:Z1000';
  ENGINEER_SHEET_NAME = process.env.GOOGLE_SHEETS_ENGINEER_SHEET || 'Engenheiro';
  EVANDRO_SHEET_NAME = process.env.GOOGLE_SHEETS_EVANDRO_SHEET || 'Evandro';
  
  // Nova planilha de engenheiros
  ENGINEER_NEW_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ENGINEER_ID || '';
  ENGINEER_NEW_SHEET_NAME = process.env.GOOGLE_SHEETS_ENGINEER_NAME || 'Engenheiro(a)';
  ENGINEER_NEW_RANGE = process.env.GOOGLE_SHEETS_ENGINEER_RANGE || 'A1:AE1000';
  
  // Validar configuração essencial (apenas para novo sistema)
  if (!ENGINEER_NEW_SPREADSHEET_ID) {
    console.error('❌ GOOGLE_SHEETS_ENGINEER_ID não configurado no .env');
    console.error('   Configure a planilha de engenheiros para usar o bot');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS não configurado no .env');
    console.error('   Configure as credenciais do Google Sheets API');
    process.exit(1);
  }

  console.log(`📊 Configuração:`);
  console.log(`   - Planilha Engenheiros: ${ENGINEER_NEW_SPREADSHEET_ID}`);
  console.log(`   - Aba: ${ENGINEER_NEW_SHEET_NAME}`);
  
  if (ENGINEER_NEW_SPREADSHEET_ID) {
    console.log(`   - Nova Planilha Engenheiros: ${ENGINEER_NEW_SPREADSHEET_ID}`);
    console.log(`   - Aba: ${ENGINEER_NEW_SHEET_NAME}`);
  }

  console.log(`\n🔄 Sistema de Fluxos Conversacionais:`);
  console.log(`   ✅ MessageHandler integrado`);
  console.log(`   ✅ Fluxo principal: EngineerProjectFlow`);
  console.log(`   ✅ Notificações: Matinal e Noturna (via cron)`);

  await client.initialize();
}

export { client };

