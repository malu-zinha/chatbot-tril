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
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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
        obj[header] = row[index] || '';
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
}

// Singleton para reutilizar instância
let sheetsServiceInstance: GoogleSheetsService | null = null;

export function getGoogleSheetsService(): GoogleSheetsService {
  if (!sheetsServiceInstance) {
    sheetsServiceInstance = new GoogleSheetsService();
  }
  return sheetsServiceInstance;
}

