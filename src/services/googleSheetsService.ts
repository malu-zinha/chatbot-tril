import { google } from 'googleapis';

export interface SheetData {
  headers: string[];
  rows: any[][];
}

export class GoogleSheetsService {
  private sheets;
  private auth;

  constructor() {
    // Autenticação com API Key (simples) ou OAuth2
    this.auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Caminho para credentials.json
      scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Permissão de leitura E escrita
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Lê dados de uma planilha do Google Sheets
   * @param spreadsheetId - ID da planilha (da URL)
   * @param range - Range de células (ex: 'Sheet1!A1:Z100')
   */
  async readSheet(spreadsheetId: string, range: string = 'A1:Z1000'): Promise<SheetData> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      
      if (rows.length === 0) {
        return { headers: [], rows: [] };
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      return { headers, rows: dataRows };
    } catch (error: any) {
      console.error('Erro ao ler Google Sheets:', error.message);
      throw new Error(`Falha ao ler planilha: ${error.message}`);
    }
  }

  /**
   * Lê dados e converte em array de objetos
   */
  async readSheetAsObjects(spreadsheetId: string, range: string = 'A1:Z1000'): Promise<any[]> {
    const { headers, rows } = await this.readSheet(spreadsheetId, range);
    
    return rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        // Normalizar headers para padronizar entre abas
        let normalizedHeader = header;
        
        // "." vira "Nº"
        if (header === '.') {
          normalizedHeader = 'Nº';
        }
        // "Data de início" vira "Data De Início"
        else if (header.toLowerCase() === 'data de início') {
          normalizedHeader = 'Data De Início';
        }
        
        obj[normalizedHeader] = row[index] || '';
      });
      return obj;
    });
  }

  /**
   * Busca simples por texto em qualquer campo
   */
  searchInSheet(data: any[], searchTerm: string): any[] {
    const term = searchTerm.toLowerCase();
    return data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(term)
      )
    );
  }

  /**
   * Lê múltiplas abas de uma planilha
   * @param spreadsheetId - ID da planilha
   * @param sheetNames - Array com nomes das abas
   * @param range - Range padrão (ex: 'A1:Z1000')
   */
  async readMultipleSheets(
    spreadsheetId: string, 
    sheetNames: string[], 
    range: string = 'A1:Z1000'
  ): Promise<Map<string, any[]>> {
    const result = new Map<string, any[]>();
    
    for (const sheetName of sheetNames) {
      try {
        const fullRange = `${sheetName}!${range}`;
        const data = await this.readSheetAsObjects(spreadsheetId, fullRange);
        result.set(sheetName, data);
      } catch (error: any) {
        console.error(`Erro ao ler aba ${sheetName}:`, error.message);
        result.set(sheetName, []);
      }
    }
    
    return result;
  }

  /**
   * Busca linha pelo ID (campo Nº)
   * @param spreadsheetId - ID da planilha
   * @param sheetName - Nome da aba
   * @param projectId - ID do projeto (ex: PRJ-001)
   * @param range - Range de busca
   * @returns Objeto com rowIndex (índice da linha no array de dados, começando em 0) e data (dados da linha)
   */
  async findRowByID(
    spreadsheetId: string,
    sheetName: string,
    projectId: string,
    range: string = 'A1:Z1000'
  ): Promise<{ rowIndex: number; actualRowNumber: number; data: any } | null> {
    try {
      const fullRange = `${sheetName}!${range}`;
      const data = await this.readSheetAsObjects(spreadsheetId, fullRange);
      
      const rowIndex = data.findIndex(row => row['Nº'] === projectId);
      
      if (rowIndex === -1) {
        return null;
      }
      
      // Extrair o número da linha inicial do range (ex: A2:H1000 → linha inicial = 2)
      const rangeMatch = range.match(/^[A-Z]+(\d+):/);
      const startRow = rangeMatch ? parseInt(rangeMatch[1], 10) : 1;
      
      // actualRowNumber = linha inicial + rowIndex (0-based) + 1 (header já está na startRow)
      // Se range é A2:H1000, startRow=2 (que é o header), então dados começam em 3
      // rowIndex=0 → linha 3, rowIndex=1 → linha 4, etc.
      return { 
        rowIndex, 
        actualRowNumber: startRow + rowIndex + 1,
        data: data[rowIndex] 
      };
    } catch (error: any) {
      console.error('Erro ao buscar linha por ID:', error.message);
      return null;
    }
  }

  /**
   * Atualiza uma célula específica
   * @param spreadsheetId - ID da planilha
   * @param sheetName - Nome da aba
   * @param row - Número da linha (começa em 1)
   * @param column - Letra da coluna (ex: 'A', 'B', 'C')
   * @param value - Novo valor
   */
  async updateCell(
    spreadsheetId: string,
    sheetName: string,
    row: number,
    column: string,
    value: any
  ): Promise<boolean> {
    try {
      const range = `${sheetName}!${column}${row}`;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]]
        }
      });
      
      console.log(`✅ Célula ${range} atualizada: ${value}`);
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar célula:', error.message);
      return false;
    }
  }

  /**
   * Atualiza uma linha completa
   * @param spreadsheetId - ID da planilha
   * @param sheetName - Nome da aba
   * @param rowNumber - Número da linha (começa em 1, incluindo header)
   * @param values - Objeto com valores {campo: valor} ou array de valores
   * @param headers - Headers da planilha (necessário se values for objeto)
   */
  async updateRow(
    spreadsheetId: string,
    sheetName: string,
    rowNumber: number,
    values: any[] | Record<string, any>,
    headers?: string[]
  ): Promise<boolean> {
    try {
      let rowData: any[];
      
      if (Array.isArray(values)) {
        rowData = values;
      } else {
        // Converter objeto para array baseado nos headers
        if (!headers) {
          throw new Error('Headers são necessários quando values é um objeto');
        }
        
        rowData = headers.map(header => {
          // Desnormalizar: mapear headers da planilha para dados normalizados
          let value = values[header];
          
          // Se não encontrou, tentar mapeamentos
          if (value === undefined) {
            // "." → "Nº"
            if (header === '.') {
              value = values['Nº'];
            }
            // "Data de início" → "Data De Início"
            else if (header.toLowerCase() === 'data de início') {
              value = values['Data De Início'];
            }
          }
          
          return value !== undefined ? value : '';
        });
      }
      
      const range = `${sheetName}!A${rowNumber}:${String.fromCharCode(64 + rowData.length)}${rowNumber}`;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData]
        }
      });
      
      console.log(`✅ Linha ${rowNumber} atualizada na aba ${sheetName}`);
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar linha:', error.message);
      return false;
    }
  }

  /**
   * Atualiza campos específicos de uma linha pelo ID do projeto
   * @param spreadsheetId - ID da planilha
   * @param sheetName - Nome da aba
   * @param projectId - ID do projeto
   * @param updates - Objeto com campos a atualizar {campo: novoValor}
   * @param range - Range de busca
   */
  async updateRowByID(
    spreadsheetId: string,
    sheetName: string,
    projectId: string,
    updates: Record<string, any>,
    range: string = 'A1:Z1000'
  ): Promise<boolean> {
    try {
      // Buscar a linha
      const result = await this.findRowByID(spreadsheetId, sheetName, projectId, range);
      
      if (!result) {
        console.error(`Projeto ${projectId} não encontrado na aba ${sheetName}`);
        return false;
      }
      
      // IMPORTANTE: Obter headers DA ABA QUE ESTAMOS ATUALIZANDO
      const fullRange = `${sheetName}!${range}`;
      const { headers } = await this.readSheet(spreadsheetId, fullRange);
      
      // Mesclar dados existentes com updates
      const updatedData = { ...result.data, ...updates };
      
      // Atualizar a linha
      return await this.updateRow(
        spreadsheetId,
        sheetName,
        result.actualRowNumber,
        updatedData,
        headers
      );
    } catch (error: any) {
      console.error('Erro ao atualizar linha por ID:', error.message);
      return false;
    }
  }

  /**
   * Adiciona uma nova linha no final da planilha
   * @param spreadsheetId - ID da planilha
   * @param sheetName - Nome da aba
   * @param values - Array de valores ou objeto {campo: valor}
   * @param headers - Headers da planilha (necessário se values for objeto)
   */
  async addRow(
    spreadsheetId: string,
    sheetName: string,
    values: any[] | Record<string, any>,
    headers?: string[]
  ): Promise<boolean> {
    try {
      let rowData: any[];
      
      if (Array.isArray(values)) {
        rowData = values;
      } else {
        // Converter objeto para array baseado nos headers
        if (!headers) {
          throw new Error('Headers são necessários quando values é um objeto');
        }
        rowData = headers.map(header => values[header] ?? '');
      }
      
      const range = `${sheetName}!A:A`; // Append na coluna A
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });
      
      console.log(`✅ Nova linha adicionada na aba ${sheetName}`);
      return true;
    } catch (error: any) {
      console.error('Erro ao adicionar linha:', error.message);
      return false;
    }
  }

  /**
   * Obtém headers de uma aba específica
   */
  async getHeaders(spreadsheetId: string, sheetName: string): Promise<string[]> {
    try {
      const range = `${sheetName}!1:1`;
      const { headers } = await this.readSheet(spreadsheetId, range);
      return headers;
    } catch (error: any) {
      console.error('Erro ao obter headers:', error.message);
      return [];
    }
  }
}

// Singleton para reutilizar instância
let sheetsServiceInstance: GoogleSheetsService | null = null;

export function getGoogleSheetsService(): GoogleSheetsService {
  if (!sheetsServiceInstance) {
    sheetsServiceInstance = new GoogleSheetsService();
  }
  return sheetsServiceInstance;
}

