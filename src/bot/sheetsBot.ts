import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import { getGoogleSheetsService } from '../services/googleSheetsService.ts';
import { WhisperService } from '../services/whisperService.ts';
import { QueryService } from '../services/queryService.ts';
import { CommandService } from '../services/commandService.ts';
import { SheetSyncService } from '../services/sheetSyncService.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({});

// Configuração da planilha (será carregado depois do dotenv.config())
let SPREADSHEET_ID = '';
let SHEET_RANGE = 'A1:Z1000';
let ENGINEER_SHEET_NAME = 'Engenheiro';
let EVANDRO_SHEET_NAME = 'Evandro';

// Cache dos dados da planilha (atualizado periodicamente)
let cachedSheetData: any[] = [];
let cachedHeaders: string[] = [];
let lastUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Sistema de confirmação de comandos
const pendingConfirmations = new Map<string, any>();

// Diretório temporário para áudios
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Atualiza cache dos dados da planilha (aba Engenheiro)
 */
async function updateSheetCache() {
  try {
    const now = Date.now();
    if (now - lastUpdate < CACHE_TTL && cachedSheetData.length > 0) {
      return; // Cache ainda válido
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

/**
 * Processa pergunta e retorna resposta da planilha
 */
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

/**
 * Processa comando de edição
 */
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

/**
 * Processa comando de atualização
 */
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

/**
 * Processa comando de adição de projeto
 */
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

/**
 * Executa comando após confirmação
 */
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

/**
 * Executa atualização confirmada
 */
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

/**
 * Executa adição confirmada
 */
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

/**
 * Cancela comando pendente
 */
function cancelPendingCommand(userId: string): string {
  const pending = pendingConfirmations.get(userId);
  
  if (!pending) {
    return '❌ Nenhum comando pendente para cancelar.';
  }

  pendingConfirmations.delete(userId);
  return '✅ Comando cancelado.';
}

// QR Code para autenticação
client.on('qr', (qr: string) => {
  console.log('📱 Escaneie o QR Code:');
  qrcode.generate(qr, { small: true });
});

// Conexão estabelecida
client.on('ready', async () => {
  console.log('✅ WhatsApp conectado!');
  console.log('📊 Carregando dados da planilha...');
  await updateSheetCache();
  
  // Atualizar cache periodicamente
  setInterval(updateSheetCache, CACHE_TTL);
});

// Lógica principal do bot
client.on('message', async (msg) => {
  // Ignorar grupos e status
  if (!msg.from.endsWith('@c.us')) return;

  const userId = msg.from;
  
  // Tentar obter nome do contato (pode falhar em algumas versões)
  let userName = 'usuário';
  try {
    const contact = await msg.getContact();
    userName = contact.pushname || contact.name || 'usuário';
  } catch (error) {
    console.log('⚠️ Não foi possível obter nome do contato, usando fallback');
  }

  try {
    // Comandos de texto
    if (msg.type === 'chat') {
      const body = msg.body.toLowerCase();

      // Menu / Ajuda
      if (body.match(/(menu|ajuda|help|oi|olá|ola|início|inicio)/)) {
        const welcomeMsg = `Olá *${userName}*! 👋\n\n` +
          `Eu sou seu assistente de projetos.\n\n` +
          `📊 *CONSULTAS:*\n` +
          `• "Qual o status do PRJ-001?"\n` +
          `• "Quantos projetos em execução?"\n` +
          `• "Mostre projetos da Alfa Ltda"\n\n` +
          `✏️ *COMANDOS DE EDIÇÃO:*\n` +
          `• "Mude o PRJ-001 para Em Execução"\n` +
          `• "Adicione projeto: Cliente X, Obra Y"\n` +
          `• "Atualize a data do PRJ-002"\n\n` +
          `🎤 *Áudio:* Grave sua mensagem!\n` +
          `🔄 *Sincronização:* Automática entre abas\n\n` +
          `_${cachedSheetData.length} projetos na aba ${ENGINEER_SHEET_NAME}_`;
        
        await client.sendMessage(msg.from, welcomeMsg);
        return;
      }

      // Atualizar cache manualmente
      if (body.match(/(atualizar|refresh|reload)/)) {
        await client.sendMessage(msg.from, '🔄 Atualizando dados da planilha...');
        lastUpdate = 0; // Forçar atualização
        await updateSheetCache();
        await client.sendMessage(msg.from, `✅ Dados atualizados! ${cachedSheetData.length} registros carregados.`);
        return;
      }

      // Verificar se tem confirmação pendente
      if (pendingConfirmations.has(userId)) {
        if (body.match(/(sim|confirmar|confirma|ok|yes)/)) {
          await client.sendMessage(msg.from, '⏳ Executando comando...');
          const result = await executeConfirmedCommand(userId);
          await client.sendMessage(msg.from, result);
          return;
        }
        
        if (body.match(/(não|nao|cancelar|cancela|no)/)) {
          const result = cancelPendingCommand(userId);
          await client.sendMessage(msg.from, result);
          return;
        }

        // Se não for sim/não, lembrar que tem comando pendente
        await client.sendMessage(msg.from, '⚠️ Você tem um comando pendente.\n\nResponda "sim" para confirmar ou "não" para cancelar.');
        return;
      }

      // Classificar intent: consulta ou comando
      await client.sendMessage(msg.from, '🤖 Analisando mensagem...');
      const classification = await QueryService.classifyIntent(msg.body);

      if (classification.type === 'command') {
        // Processar como comando de edição
        const result = await processCommand(msg.body, userId);
        await client.sendMessage(msg.from, result);
      } else {
        // Processar como consulta
        const answer = await processQuestion(msg.body);
        await client.sendMessage(msg.from, answer);
      }
      
      return;
    }

    // Processar áudio
    if (msg.type === 'ptt' || msg.type === 'audio') {
      // Verificar se tem confirmação pendente
      if (pendingConfirmations.has(userId)) {
        await client.sendMessage(msg.from, '⚠️ Você tem um comando pendente.\n\nResponda com *texto* "sim" para confirmar ou "não" para cancelar.');
        return;
      }

      await client.sendMessage(msg.from, '🎤 Transcrevendo áudio...');
      
      const media = await msg.downloadMedia();
      if (!media) {
        await client.sendMessage(msg.from, '❌ Não consegui baixar o áudio. Tente novamente.');
        return;
      }

      // Transcrever
      const transcription = await processAudio(media, userId);
      
      if (!transcription || transcription.trim() === '') {
        await client.sendMessage(msg.from, '❌ Não consegui entender o áudio. Pode repetir?');
        return;
      }

      // Validar transcrição
      if (transcription.length < 5) {
        await client.sendMessage(msg.from, `📝 Você disse: _"${transcription}"_\n\n❌ Áudio muito curto. Pode repetir mais claramente?`);
        return;
      }

      // Mostrar transcrição
      await client.sendMessage(msg.from, `📝 Você disse: _"${transcription}"_`);
      
      // Classificar intent: consulta ou comando
      await client.sendMessage(msg.from, '🤖 Analisando...');
      const classification = await QueryService.classifyIntent(transcription);

      if (classification.type === 'command') {
        // Processar como comando de edição
        const result = await processCommand(transcription, userId);
        await client.sendMessage(msg.from, result);
      } else {
        // Processar como consulta
        const answer = await processQuestion(transcription);
        await client.sendMessage(msg.from, answer);
      }
      
      return;
    }

    // Outros tipos de mensagem
    await client.sendMessage(msg.from, '❌ Só consigo processar texto ou áudio. Digite "menu" para ajuda.');

  } catch (error: any) {
    console.error('❌ Erro no bot:', error);
    await client.sendMessage(msg.from, '❌ Desculpe, ocorreu um erro. Tente novamente ou digite "menu" para ajuda.');
  }
});

export async function startSheetsBot() {
  console.log('🚀 Iniciando Sheets Bot...');
  
  // Carregar configurações do .env (agora sim!)
  SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '';
  SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'A1:Z1000';
  ENGINEER_SHEET_NAME = process.env.GOOGLE_SHEETS_ENGINEER_SHEET || 'Engenheiro';
  EVANDRO_SHEET_NAME = process.env.GOOGLE_SHEETS_EVANDRO_SHEET || 'Evandro';
  
  // Validar configuração
  if (!SPREADSHEET_ID) {
    console.error('❌ GOOGLE_SHEETS_ID não configurado no .env');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurado no .env');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS não configurado no .env');
    process.exit(1);
  }

  console.log(`📊 Configuração:`);
  console.log(`   - Planilha: ${SPREADSHEET_ID}`);
  console.log(`   - Aba Engenheiro: ${ENGINEER_SHEET_NAME}`);
  console.log(`   - Aba Evandro: ${EVANDRO_SHEET_NAME}`);

  await client.initialize();
}

export { client };

