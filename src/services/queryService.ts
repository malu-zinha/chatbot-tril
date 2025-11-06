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

export class QueryService {
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
      // Criar contexto com amostra dos dados
      const sampleData = sheetData.slice(0, 5); // Primeiros 5 registros como exemplo
      
      const systemPrompt = `Você é um assistente especializado em consultar dados de planilhas.

DADOS DISPONÍVEIS:
- Colunas: ${headers.join(', ')}
- Total de registros: ${sheetData.length}
- Amostra dos dados (primeiros registros):
${JSON.stringify(sampleData, null, 2)}

TODOS OS DADOS:
${JSON.stringify(sheetData, null, 2)}

Sua tarefa é:
1. Interpretar a pergunta do usuário
2. Buscar nos dados fornecidos
3. Retornar uma resposta clara e objetiva
4. Se houver múltiplos resultados, liste-os de forma organizada
5. Se não encontrar dados relevantes, informe de forma amigável

Retorne APENAS um JSON no formato:
{
  "answer": "resposta em texto formatado para WhatsApp (use *negrito*, _itálico_, e quebras de linha)",
  "data": [...dados relevantes encontrados...],
  "confidence": "high" | "medium" | "low"
}`;

      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('Resposta vazia da OpenAI');

      const result = JSON.parse(response);
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
        model: "gpt-3.5-turbo",
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

      // Agora gera a resposta com dados filtrados
      return this.querySheet(question, relevantData.slice(0, 50), headers);

    } catch (error) {
      console.error('Erro no query otimizado:', error);
      return this.querySheet(question, sheetData.slice(0, 20), headers);
    }
  }
}

