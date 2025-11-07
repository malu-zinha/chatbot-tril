import OpenAI from 'openai';
import fs from 'fs';

let openai: OpenAI;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export class WhisperService {
  /**
   * Transcreve áudio usando Whisper
   * @param audioPath - Caminho do arquivo de áudio
   * @returns Texto transcrito
   */
  static async transcribe(audioPath: string): Promise<string> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(audioPath)) {
        throw new Error('Arquivo de áudio não encontrado');
      }

      console.log(`🎤 Transcrevendo áudio: ${audioPath}`);
      const audioFile = fs.createReadStream(audioPath);
      const client = getOpenAIClient();
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt', // Português
        response_format: 'text'
      });

      console.log(`✅ Áudio transcrito com sucesso`);
      return transcription as string;
    } catch (error: any) {
      console.error('❌ Erro detalhado ao transcrever áudio:', error);
      
      // Mensagens de erro mais específicas
      if (error.message?.includes('Connection error')) {
        throw new Error('Erro de conexão com a API OpenAI. Verifique sua internet e chave da API.');
      } else if (error.message?.includes('API key')) {
        throw new Error('Chave da API OpenAI inválida. Verifique o arquivo .env');
      } else if (error.message?.includes('insufficient_quota')) {
        throw new Error('Sem créditos na conta OpenAI. Adicione créditos em platform.openai.com');
      }
      
      throw new Error(`Falha na transcrição: ${error.message}`);
    }
  }

  /**
   * Transcreve com timestamps (útil para análise)
   */
  static async transcribeWithTimestamps(audioPath: string): Promise<any> {
    try {
      const audioFile = fs.createReadStream(audioPath);
      const client = getOpenAIClient();
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'verbose_json'
      });

      return transcription;
    } catch (error: any) {
      console.error('Erro ao transcrever áudio:', error.message);
      throw new Error(`Falha na transcrição: ${error.message}`);
    }
  }
}

