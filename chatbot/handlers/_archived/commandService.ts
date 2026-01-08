import OpenAI from 'openai';
import { getGoogleSheetsService } from '../../integrations/sheets/googleSheetsService.ts';

let openai: OpenAI;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export interface CommandIntent {
  action: 'update' | 'add' | 'delete' | 'query' | 'unknown';
  projectId?: string;
  fields?: Record<string, any>;
  confidence: 'high' | 'medium' | 'low';
  originalCommand: string;
}

export interface CommandPreview {
  projectId: string;
  projectName: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  affectedSheets: string[];
}

export class CommandService {
  /**
   * Analisa um comando em linguagem natural e retorna a intenção estruturada
   * @param command - Comando do usuário
   * @param availableFields - Campos disponíveis na planilha
   */
  static async parseCommand(
    command: string,
    availableFields: string[]
  ): Promise<CommandIntent> {
    try {
      const systemPrompt = `Você é um assistente que analisa comandos para editar uma planilha de projetos de engenharia.

CAMPOS DISPONÍVEIS NA PLANILHA:
${availableFields.join(', ')}

REGRAS IMPORTANTES:
1. O campo "Nº" contém o ID do projeto (são números simples: "1", "2", "3", etc)
2. Se o usuário mencionar "projeto 1", "projeto 001", "projeto um" → retorne projectId: "1"
3. Se o usuário mencionar "projeto 2", "projeto dois" → retorne projectId: "2"
4. NUNCA converta para formato "PRJ-XXX", mantenha números simples
5. Para datas, use formato brasileiro DD/MM/AAAA
6. Status deve ser um dos valores válidos abaixo

TIPOS DE AÇÃO:
- "update": Atualizar projeto existente
- "add": Adicionar novo projeto
- "delete": Remover projeto
- "query": Apenas consultar (não é comando de edição)

VALORES VÁLIDOS PARA "Status do Projeto":
- Aguardando Início
- Em Execução
- Aguardando Inf. Cliente
- Parado TecPred
- Parado Cliente
- Em aprovação
- Aprovado Energisa

Analise o comando e retorne JSON:
{
  "action": "update" | "add" | "delete" | "query",
  "projectId": "1" (número simples se for update/delete),
  "fields": { "campo": "valor" } (campos a atualizar/adicionar),
  "confidence": "high" | "medium" | "low"
}

EXEMPLOS:

Comando: "Mude o projeto 1 para Em Execução"
Resposta: {
  "action": "update",
  "projectId": "1",
  "fields": { "Status do Projeto": "Em Execução" },
  "confidence": "high"
}

Comando: "Mude o status do projeto 2 para Parado Cliente"
Resposta: {
  "action": "update",
  "projectId": "2",
  "fields": { "Status do Projeto": "Parado Cliente" },
  "confidence": "high"
}

Comando: "Adicione novo projeto: Cliente Alfa Ltda, Obra Predial, Área Elétrico"
Resposta: {
  "action": "add",
  "fields": { 
    "Cliente": "Alfa Ltda", 
    "Obra": "Predial", 
    "Área": "Elétrico",
    "Status do Projeto": "Aguardando Início"
  },
  "confidence": "high"
}

Comando: "Qual o status do projeto 1?"
Resposta: {
  "action": "query",
  "confidence": "high"
}`;

      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: command }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('Resposta vazia da OpenAI');

      const intent: CommandIntent = {
        ...JSON.parse(response),
        originalCommand: command
      };

      console.log('🤖 Comando interpretado:', intent);
      return intent;

    } catch (error: any) {
      console.error('Erro ao interpretar comando:', error.message);
      return {
        action: 'unknown',
        confidence: 'low',
        originalCommand: command
      };
    }
  }

  /**
   * Gera preview das mudanças antes de executar
   */
  static async generatePreview(
    spreadsheetId: string,
    sheetName: string,
    intent: CommandIntent,
    range?: string
  ): Promise<CommandPreview | null> {
    try {
      if (intent.action !== 'update' || !intent.projectId) {
        return null;
      }

      const sheetsService = getGoogleSheetsService();
      const currentData = await sheetsService.findRowByID(
        spreadsheetId,
        sheetName,
        intent.projectId,
        range
      );

      if (!currentData) {
        return null;
      }

      const changes = [];
      for (const [field, newValue] of Object.entries(intent.fields || {})) {
        const oldValue = currentData.data[field];
        if (oldValue !== newValue) {
          changes.push({
            field,
            oldValue: oldValue || '(vazio)',
            newValue
          });
        }
      }

      const projectName = `${currentData.data['Cliente'] || ''} - ${currentData.data['Obra'] || ''}`.trim();

      return {
        projectId: intent.projectId,
        projectName: projectName || intent.projectId,
        changes,
        affectedSheets: ['Engenheiro', 'Evandro']
      };

    } catch (error: any) {
      console.error('Erro ao gerar preview:', error.message);
      return null;
    }
  }

  /**
   * Formata preview para mensagem do WhatsApp
   */
  static formatPreviewMessage(preview: CommandPreview): string {
    let message = `📝 *Confirme a alteração:*\n\n`;
    message += `🔹 *Projeto:* ${preview.projectId}\n`;
    message += `🔹 *Nome:* ${preview.projectName}\n\n`;
    message += `*Mudanças:*\n`;

    for (const change of preview.changes) {
      message += `• *${change.field}*\n`;
      message += `  De: _"${change.oldValue}"_\n`;
      message += `  Para: *"${change.newValue}"*\n\n`;
    }

    message += `*Será aplicado em:*\n`;
    for (const sheet of preview.affectedSheets) {
      message += `✅ Aba ${sheet}\n`;
    }

    message += `\n_Responda "sim" ou "confirmar" para executar_\n`;
    message += `_Responda "não" ou "cancelar" para desistir_`;

    return message;
  }

  /**
   * Valida se um comando pode ser executado
   */
  static validateCommand(intent: CommandIntent): { valid: boolean; error?: string } {
    // Comando desconhecido
    if (intent.action === 'unknown') {
      return {
        valid: false,
        error: '❌ Não consegui entender o comando. Pode reformular?\n\n' +
               '_Exemplos:_\n' +
               '• "Mude o projeto PRJ-001 para Em Execução"\n' +
               '• "Adicione novo projeto: Cliente X, Obra Y, Área Elétrico"'
      };
    }

    // Query não é comando de edição
    if (intent.action === 'query') {
      return {
        valid: false,
        error: '💬 Isso parece uma consulta, não um comando de edição.\n\n' +
               'Para consultas, apenas pergunte normalmente.\n' +
               'Para edições, use comandos como:\n' +
               '• "Mude o projeto..."\n' +
               '• "Atualize..."\n' +
               '• "Adicione..."'
      };
    }

    // Update sem ID
    if (intent.action === 'update' && !intent.projectId) {
      return {
        valid: false,
        error: '❌ Para atualizar, preciso do ID do projeto (ex: PRJ-001)'
      };
    }

    // Update/Add sem campos
    if ((intent.action === 'update' || intent.action === 'add') && 
        (!intent.fields || Object.keys(intent.fields).length === 0)) {
      return {
        valid: false,
        error: '❌ Preciso saber quais campos alterar'
      };
    }

    // Confiança baixa
    if (intent.confidence === 'low') {
      return {
        valid: false,
        error: '❌ Não tenho certeza se entendi o comando corretamente. Pode reformular?'
      };
    }

    return { valid: true };
  }

  /**
   * Gera sugestão de próximo ID de projeto
   */
  static async generateNextProjectId(
    spreadsheetId: string,
    sheetName: string,
    range?: string
  ): Promise<string> {
    try {
      const sheetsService = getGoogleSheetsService();
      const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A1:Z1000`;
      const data = await sheetsService.readSheetAsObjects(
        spreadsheetId,
        fullRange
      );

      // Encontrar maior número de projeto (agora são números simples: "1", "2", "3")
      let maxNum = 0;
      for (const row of data) {
        const id = row['Nº'];
        if (id) {
          const num = parseInt(String(id), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }

      // Próximo ID (número simples)
      const nextNum = maxNum + 1;
      return String(nextNum);

    } catch (error: any) {
      console.error('Erro ao gerar próximo ID:', error.message);
      return '1';
    }
  }
}

