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
      const audioFile = fs.createReadStream(audioPath);
      const client = getOpenAIClient();
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt', // Português
        response_format: 'text'
      });

      return transcription as string;
    } catch (error: any) {
      console.error('Erro ao transcrever áudio:', error.message);
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

