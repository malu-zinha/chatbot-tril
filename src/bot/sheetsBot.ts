import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import { getGoogleSheetsService } from '../services/googleSheetsService.ts';
import { WhisperService } from '../services/whisperService.ts';
import { QueryService } from '../services/queryService.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({});

// Configuração da planilha (será carregado depois do dotenv.config())
let SPREADSHEET_ID = '';
let SHEET_RANGE = 'A1:Z1000';

// Cache dos dados da planilha (atualizado periodicamente)
let cachedSheetData: any[] = [];
let cachedHeaders: string[] = [];
let lastUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Diretório temporário para áudios
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Atualiza cache dos dados da planilha
 */
async function updateSheetCache() {
  try {
    const now = Date.now();
    if (now - lastUpdate < CACHE_TTL && cachedSheetData.length > 0) {
      return; // Cache ainda válido
    }

    const sheetsService = getGoogleSheetsService();
    const data = await sheetsService.readSheetAsObjects(SPREADSHEET_ID, SHEET_RANGE);
    const { headers } = await sheetsService.readSheet(SPREADSHEET_ID, SHEET_RANGE);
    
    cachedSheetData = data;
    cachedHeaders = headers;
    lastUpdate = now;
    
    console.log(`✅ Cache atualizado: ${data.length} registros`);
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
  const contact = await msg.getContact();
  const userName = contact.pushname || 'usuário';

  try {
    // Comandos de texto
    if (msg.type === 'chat') {
      const body = msg.body.toLowerCase();

      // Menu / Ajuda
      if (body.match(/(menu|ajuda|help|oi|olá|ola|início|inicio)/)) {
        const welcomeMsg = `Olá *${userName}*! 👋\n\n` +
          `Eu sou seu assistente de consulta de dados.\n\n` +
          `📊 *Como usar:*\n` +
          `• Envie uma pergunta em *texto* ou *áudio*\n` +
          `• Farei uma busca na planilha\n` +
          `• Retornarei as informações relevantes\n\n` +
          `📝 *Exemplos:*\n` +
          `• "Qual o valor total de vendas?"\n` +
          `• "Mostre os clientes de São Paulo"\n` +
          `• "Quantos produtos temos?"\n\n` +
          `🎤 *Áudio:* Grave sua pergunta que eu transcrevo!\n\n` +
          `_Planilha sincronizada: ${cachedSheetData.length} registros_`;
        
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

      // Processar pergunta
      await client.sendMessage(msg.from, '🤖 Consultando a planilha...');
      const answer = await processQuestion(msg.body);
      await client.sendMessage(msg.from, answer);
      return;
    }

    // Processar áudio
    if (msg.type === 'ptt' || msg.type === 'audio') {
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

      // Mostrar transcrição
      await client.sendMessage(msg.from, `📝 Você disse: _"${transcription}"_\n\n🔍 Buscando na planilha...`);
      
      // Processar pergunta
      const answer = await processQuestion(transcription);
      await client.sendMessage(msg.from, answer);
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

  await client.initialize();
}

export { client };

