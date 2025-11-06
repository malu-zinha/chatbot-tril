import OpenAI from 'openai';
import { OpenAIResponse } from '../types/botTypes.ts';
import { Area, getSuggestedFields } from '../utils/areaMapper.ts';

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class OpenAIService {
  // Analisa entrada do usuário e sugere campos estruturados
  static async analyzeInput(userInput: string, area: Area): Promise<OpenAIResponse> {
    try {
      const suggestedFields = getSuggestedFields(area);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em projetos de ${area}. 
                     Analise a entrada do usuário e extraia ou sugira valores para os seguintes campos: ${suggestedFields.join(', ')}.
                     Retorne apenas os campos relevantes em formato JSON.`
          },
          {
            role: "user",
            content: userInput
          }
        ]
      });

      const suggestion = completion.choices[0]?.message?.content || '';
      
      try {
        const fields = JSON.parse(suggestion);
        return {
          text: "Dados estruturados com sucesso",
          fields: Object.entries(fields).map(([name, value]) => ({ name, value: String(value) }))
        };
      } catch {
        return {
          text: "Não foi possível estruturar os dados",
          suggestion
        };
      }
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      return {
        text: "Erro ao processar com IA",
        suggestion: userInput
      };
    }
  }

  // Valida e sugere correções para os dados
  static async validateData(data: string, area: Area): Promise<OpenAIResponse> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em validação de projetos de ${area}.
                     Analise os dados fornecidos e sugira correções ou melhorias se necessário.
                     Considere unidades de medida, valores típicos e boas práticas da área.`
          },
          {
            role: "user",
            content: data
          }
        ]
      });

      return {
        text: completion.choices[0]?.message?.content || "Sem sugestões",
        suggestion: data
      };
    } catch (error) {
      console.error('Erro ao validar com OpenAI:', error);
      return {
        text: "Erro ao validar dados",
        suggestion: data
      };
    }
  }
}