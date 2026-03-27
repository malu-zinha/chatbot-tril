import { getGoogleSheetsService } from './googleSheetsService.ts';

// Campos exclusivos da aba Evandro (NÃO serão sincronizados da aba Engenheiro)
// Todos os outros campos que existirem em ambas as abas serão sincronizados automaticamente
const EVANDRO_EXCLUSIVE_FIELDS = [
  'Engenheiro responsável',
  'Previsão de entrega (interna)',
  'Dias de Atraso',
  'Quantidade de revisões',
  '% executado',
  'Métrica de Retrabalho'
];

export interface SyncResult {
  success: boolean;
  syncedFields: string[];
  errors: string[];
}

export class SheetSyncService {
  /**
   * Sincroniza campos em comum da aba Engenheiro para a aba Evandro
   * @param spreadsheetId - ID da planilha
   * @param projectId - ID do projeto a sincronizar
   * @param engineerSheetName - Nome da aba do Engenheiro
   * @param evandroSheetName - Nome da aba do Evandro
   * @param range - Range opcional para buscar dados
   */
  static async syncProjectToEvandro(
    spreadsheetId: string,
    projectId: string,
    engineerSheetName: string = 'Engenheiro',
    evandroSheetName: string = 'Evandro',
    range?: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedFields: [],
      errors: []
    };

    try {
      const sheetsService = getGoogleSheetsService();

      // Buscar dados na aba Engenheiro
      const engineerRow = await sheetsService.findRowByID(
        spreadsheetId,
        engineerSheetName,
        projectId,
        range
      );

      if (!engineerRow) {
        result.errors.push(`Projeto ${projectId} não encontrado na aba ${engineerSheetName}`);
        return result;
      }

      // Buscar dados na aba Evandro
      const evandroRow = await sheetsService.findRowByID(
        spreadsheetId,
        evandroSheetName,
        projectId,
        range
      );

      if (!evandroRow) {
        result.errors.push(`Projeto ${projectId} não encontrado na aba ${evandroSheetName}. Sincronização não realizada.`);
        result.success = false;
        console.log(`⚠️ Projeto ${projectId} existe apenas na aba ${engineerSheetName}`);
        return result;
      }

      // Detectar automaticamente campos em comum (exceto exclusivos do Evandro)
      const engineerFields = Object.keys(engineerRow.data);
      const evandroFields = Object.keys(evandroRow.data);
      
      // Campos que existem em ambas as abas e não são exclusivos do Evandro
      const commonFields = engineerFields.filter(field => 
        evandroFields.includes(field) && 
        !EVANDRO_EXCLUSIVE_FIELDS.includes(field)
      );
      
      // Preparar updates: todos os campos em comum
      const updates: Record<string, any> = {};
      
      for (const field of commonFields) {
        if (engineerRow.data[field] !== undefined) {
          updates[field] = engineerRow.data[field];
          result.syncedFields.push(field);
        }
      }

      // Atualizar aba Evandro preservando campos exclusivos
      const success = await sheetsService.updateRowByID(
        spreadsheetId,
        evandroSheetName,
        projectId,
        updates,
        range
      );

      result.success = success;

      if (success) {
        console.log(`✅ Sincronização concluída: ${projectId}`);
        console.log(`   Campos sincronizados: ${result.syncedFields.join(', ')}`);
      } else {
        result.errors.push('Falha ao atualizar aba Evandro');
      }

      return result;
    } catch (error: any) {
      console.error('Erro na sincronização:', error.message);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Sincroniza todos os projetos da aba Engenheiro para Evandro
   */
  static async syncAllProjects(
    spreadsheetId: string,
    engineerSheetName: string = 'Engenheiro',
    evandroSheetName: string = 'Evandro'
  ): Promise<{ total: number; synced: number; errors: string[] }> {
    const summary = {
      total: 0,
      synced: 0,
      errors: [] as string[]
    };

    try {
      const sheetsService = getGoogleSheetsService();

      // Ler todos os projetos da aba Engenheiro
      const engineerData = await sheetsService.readSheetAsObjects(
        spreadsheetId,
        `${engineerSheetName}!A1:Z1000`
      );

      summary.total = engineerData.length;

      // Sincronizar cada projeto
      for (const project of engineerData) {
        const projectId = project['Nº'];
        
        if (!projectId) {
          continue; // Pular linhas sem ID
        }

        const result = await this.syncProjectToEvandro(
          spreadsheetId,
          projectId,
          engineerSheetName,
          evandroSheetName
        );

        if (result.success) {
          summary.synced++;
        } else {
          summary.errors.push(...result.errors);
        }
      }

      console.log(`\n📊 Sincronização completa:`);
      console.log(`   Total: ${summary.total} projetos`);
      console.log(`   Sincronizados: ${summary.synced}`);
      console.log(`   Erros: ${summary.errors.length}`);

      return summary;
    } catch (error: any) {
      console.error('Erro ao sincronizar todos os projetos:', error.message);
      summary.errors.push(error.message);
      return summary;
    }
  }

  /**
   * Verifica se um campo pode ser sincronizado (não é exclusivo do Evandro)
   */
  static isFieldSyncable(fieldName: string): boolean {
    return !EVANDRO_EXCLUSIVE_FIELDS.includes(fieldName);
  }

  /**
   * Retorna lista de campos exclusivos do Evandro
   */
  static getEvandroExclusiveFields(): string[] {
    return [...EVANDRO_EXCLUSIVE_FIELDS];
  }

  /**
   * Cria novo projeto em ambas as abas
   * @param spreadsheetId - ID da planilha
   * @param projectData - Dados do projeto
   * @param engineerSheetName - Nome da aba do Engenheiro
   * @param evandroSheetName - Nome da aba do Evandro
   */
  static async createProjectInBothSheets(
    spreadsheetId: string,
    projectData: Record<string, any>,
    engineerSheetName: string = 'Engenheiro',
    evandroSheetName: string = 'Evandro'
  ): Promise<{ success: boolean; projectId: string; errors: string[] }> {
    const result = {
      success: false,
      projectId: projectData['Nº'] || '',
      errors: [] as string[]
    };

    try {
      const sheetsService = getGoogleSheetsService();

      // Obter headers de cada aba
      const engineerHeaders = await sheetsService.getHeaders(spreadsheetId, engineerSheetName);
      const evandroHeaders = await sheetsService.getHeaders(spreadsheetId, evandroSheetName);

      // Criar linha na aba Engenheiro (exclui campos exclusivos do Evandro)
      const engineerData: Record<string, any> = {};
      for (const header of engineerHeaders) {
        if (!EVANDRO_EXCLUSIVE_FIELDS.includes(header) && projectData[header]) {
          engineerData[header] = projectData[header];
        }
      }

      const engineerSuccess = await sheetsService.addRow(
        spreadsheetId,
        engineerSheetName,
        engineerData,
        engineerHeaders
      );

      if (!engineerSuccess) {
        result.errors.push('Falha ao criar projeto na aba Engenheiro');
        return result;
      }

      // Criar linha na aba Evandro (campos comuns + exclusivos se fornecidos)
      const evandroData: Record<string, any> = { ...engineerData };
      
      // Adicionar campos exclusivos se fornecidos
      for (const header of evandroHeaders) {
        if (projectData[header] && !evandroData[header]) {
          evandroData[header] = projectData[header];
        }
      }

      const evandroSuccess = await sheetsService.addRow(
        spreadsheetId,
        evandroSheetName,
        evandroData,
        evandroHeaders
      );

      if (!evandroSuccess) {
        result.errors.push('Falha ao criar projeto na aba Evandro');
        return result;
      }

      result.success = true;
      console.log(`✅ Projeto ${result.projectId} criado em ambas as abas`);

      return result;
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error.message);
      result.errors.push(error.message);
      return result;
    }
  }
}

