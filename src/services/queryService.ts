import OpenAI from 'openai';

let openai: OpenAI;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export interface QueryResult {
  answer: string;
  data?: any[];
  confidence: 'high' | 'medium' | 'low';
}

export interface IntentClassification {
  type: 'query' | 'command';
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export class QueryService {
  /**
   * Classifica se a mensagem é uma consulta ou comando de edição
   * @param message - Mensagem do usuário
   */
  static async classifyIntent(message: string): Promise<IntentClassification> {
    try {
      const systemPrompt = `Você classifica mensagens como CONSULTA ou COMANDO de edição.

CONSULTA: perguntas sobre dados (ex: "qual o status?", "quantos projetos?")
COMANDO: ordens para alterar dados (ex: "mude o status", "adicione projeto", "atualize")

Palavras-chave de COMANDO:
- mude, altere, atualize, modifique, troque
- adicione, crie, insira
- remova, delete, exclua
- defina, configure

Palavras-chave de CONSULTA:
- qual, quanto, quantos, quais
- mostre, liste, exiba
- como está, status de
- busque, procure

Retorne JSON:
{
  "type": "query" | "command",
  "confidence": "high" | "medium" | "low",
  "reasoning": "breve explicação"
}`;

      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('Resposta vazia');

      const classification = JSON.parse(response);
      console.log(`🔍 Classificação: ${classification.type} (${classification.confidence})`);
      
      return classification;

    } catch (error: any) {
      console.error('Erro ao classificar intent:', error.message);
      
      // Fallback: classificação simples baseada em palavras-chave
      const lowerMsg = message.toLowerCase();
      
      const commandKeywords = ['mude', 'altere', 'atualize', 'modifique', 'adicione', 'crie', 'remova', 'delete', 'defina'];
      const isCommand = commandKeywords.some(keyword => lowerMsg.includes(keyword));
      
      return {
        type: isCommand ? 'command' : 'query',
        confidence: 'low',
        reasoning: 'Classificação por fallback (erro na LLM)'
      };
    }
  }

  /**
   * Interpreta uma pergunta em linguagem natural e busca na planilha
   * @param question - Pergunta do usuário
   * @param sheetData - Dados da planilha
   * @param headers - Cabeçalhos da planilha
   */
  static async querySheet(
    question: string, 
    sheetData: any[], 
    headers: string[]
  ): Promise<QueryResult> {
    try {
      console.log(`📊 Processando query com ${sheetData.length} registros`);
      console.log(`📋 Colunas: ${headers.join(', ')}`);
      
      // Criar contexto com amostra dos dados
      const sampleData = sheetData.slice(0, 5); // Primeiros 5 registros como exemplo
      
      const systemPrompt = `Você é um assistente que responde perguntas EXCLUSIVAMENTE baseado nos dados fornecidos abaixo.

IMPORTANTE: Você DEVE usar APENAS os dados que estou fornecendo. NÃO invente informações. NÃO diga que não tem dados se eles estão listados abaixo.

DADOS COMPLETOS DA PLANILHA:
${JSON.stringify(sheetData, null, 2)}

COLUNAS DISPONÍVEIS: ${headers.join(', ')}
TOTAL DE REGISTROS: ${sheetData.length}

REGRAS OBRIGATÓRIAS:
1. Busque a resposta NOS DADOS ACIMA
2. Se encontrar informação relevante, responda com os dados encontrados
3. Use as colunas: ${headers.join(', ')}
4. Seja específico e mostre os valores encontrados
5. Formate a resposta para WhatsApp (*negrito*, _itálico_, quebras de linha)
6. NUNCA diga "não tenho informações" se os dados existem acima

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "answer": "Resposta clara com os dados encontrados acima",
  "data": [...dados relevantes encontrados...],
  "confidence": "high" | "medium" | "low"
}

Analise a pergunta do usuário e responda usando APENAS os dados fornecidos acima.`;

      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini", // Mais barato e eficiente
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.1, // Mais preciso e determinístico
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('Resposta vazia da OpenAI');

      const result = JSON.parse(response);
      console.log(`✅ Resposta gerada com confiança: ${result.confidence}`);
      
      return {
        answer: result.answer || 'Não consegui processar a pergunta.',
        data: result.data || [],
        confidence: result.confidence || 'low'
      };

    } catch (error: any) {
      console.error('Erro ao processar query:', error.message);
      
      // Fallback: busca simples por palavras-chave
      const keywords = question.toLowerCase().split(/\s+/);
      const matches = sheetData.filter(row => 
        keywords.some(keyword => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(keyword)
          )
        )
      );

      if (matches.length > 0) {
        let answer = `Encontrei *${matches.length}* resultado(s):\n\n`;
        matches.slice(0, 5).forEach((match, idx) => {
          answer += `*${idx + 1}.* `;
          answer += Object.entries(match)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');
          answer += '\n\n';
        });
        
        if (matches.length > 5) {
          answer += `_... e mais ${matches.length - 5} resultado(s)_`;
        }

        return { answer, data: matches, confidence: 'medium' };
      }

      return {
        answer: '❌ Não encontrei informações sobre isso na planilha. Pode reformular a pergunta?',
        data: [],
        confidence: 'low'
      };
    }
  }

  /**
   * Query otimizada para planilhas grandes (não envia todos os dados para GPT)
   */
  static async querySheetOptimized(
    question: string,
    sheetData: any[],
    headers: string[]
  ): Promise<QueryResult> {
    try {
      // Primeiro, usa GPT para entender o que o usuário quer
      const intentPrompt = `Pergunta do usuário: "${question}"

Colunas disponíveis na planilha: ${headers.join(', ')}

Analise a pergunta e retorne JSON:
{
  "intent": "filter" | "aggregate" | "search" | "list",
  "columns": ["colunas relevantes"],
  "keywords": ["palavras-chave para buscar"],
  "operation": "sum" | "count" | "avg" | "list" | "find"
}`;

      const client = getOpenAIClient();
      const intentCompletion = await client.chat.completions.create({
        model: "gpt-4o-mini", // Mais barato e eficiente
        messages: [{ role: "user", content: intentPrompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const intent = JSON.parse(intentCompletion.choices[0]?.message?.content || '{}');
      
      // Filtra dados localmente baseado no intent
      let relevantData = sheetData;
      if (intent.keywords && intent.keywords.length > 0) {
        relevantData = sheetData.filter(row =>
          intent.keywords.some((keyword: string) =>
            Object.values(row).some(value =>
              String(value).toLowerCase().includes(keyword.toLowerCase())
            )
          )
        );
      }

      // Se não encontrou dados relevantes, usa todos (limitado)
      const dataToQuery = relevantData.length > 0 ? relevantData.slice(0, 50) : sheetData.slice(0, 50);
      
      // Agora gera a resposta com dados filtrados
      return this.querySheet(question, dataToQuery, headers);

    } catch (error) {
      console.error('Erro no query otimizado:', error);
      return this.querySheet(question, sheetData.slice(0, 20), headers);
    }
  }
}

