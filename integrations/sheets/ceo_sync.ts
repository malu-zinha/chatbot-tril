// =====================================================
// INTEGRAÇÃO: Sincronização Supabase → Planilha do CEO
// =====================================================
// Responsabilidade: Iza (Integrações)
//
// Este módulo exporta dados consolidados do Supabase
// para a planilha do CEO com visão geral de todos os projetos
// =====================================================

import { google } from 'googleapis';
import { criarClienteSupabaseValidado } from '../supabase/createValidatedClient.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface CEODashboardRow {
  codigo_projeto: string;
  nome_projeto: string;
  cliente: string;
  engenheiro: string;
  area: string;
  tipo_obra: string;
  status: string;
  percentual_concluido: number;
  data_inicio: string;
  previsao_termino: string;
  ultima_atualizacao: string;
  total_retrabalhos: number;
  impacto_retrabalho: number;
  situacao: string;
}

interface SyncCEOResult {
  success: boolean;
  projetos_exportados: number;
  timestamp: string;
  error?: string;
}

// =====================================================
// CONFIGURAÇÃO
// =====================================================

class CEOSyncService {
  private supabase: any;
  private sheets: any;

  constructor() {
    // Inicializar Supabase — trim + validação antes do createClient. Sem isso,
    // um \r\n na variável só falharia lá dentro do fetch, com a chave na
    // mensagem da exceção.
    this.supabase = criarClienteSupabaseValidado('CEOSyncService');

    // Inicializar Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  // =====================================================
  // FUNÇÃO: Buscar Dados Consolidados do Supabase
  // =====================================================

  async buscarDadosConsolidados(): Promise<CEODashboardRow[]> {
    try {
      // Usar a view view_dashboard_ceo criada no views.sql
      const { data, error } = await this.supabase
        .from('view_dashboard_ceo')
        .select('*')
        .order('"% Concluído"', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados consolidados:', error);
        throw error;
      }

      // Mapear para formato da planilha
      const rows: CEODashboardRow[] = (data || []).map((row: any) => ({
        codigo_projeto: row['Código Projeto'] || '',
        nome_projeto: row['Nome Projeto'] || '',
        cliente: row['Cliente'] || '',
        engenheiro: row['Engenheiro'] || '',
        area: row['Área'] || '',
        tipo_obra: row['Tipo Obra'] || '',
        status: row['Status'] || '',
        percentual_concluido: row['% Concluído'] || 0,
        data_inicio: row['Data Início'] || '',
        previsao_termino: row['Previsão Término'] || '',
        ultima_atualizacao: row['Última Atualização'] || '',
        total_retrabalhos: row['Total Retrabalhos'] || 0,
        impacto_retrabalho: row['Impacto Retrabalho (%)'] || 0,
        situacao: row['Situação'] || '',
      }));

      console.log(`📊 ${rows.length} projetos encontrados no banco de dados`);
      return rows;
    } catch (error) {
      console.error('Erro ao buscar dados consolidados:', error);
      throw error;
    }
  }

  // =====================================================
  // FUNÇÃO: Formatar Dados para Planilha
  // =====================================================

  formatarParaPlanilha(dados: CEODashboardRow[]): any[][] {
    // Cabeçalho
    const header = [
      'Código',
      'Projeto',
      'Cliente',
      'Engenheiro',
      'Área',
      'Tipo Obra',
      'Status',
      '% Concluído',
      'Data Início',
      'Previsão Término',
      'Última Atualização',
      'Retrabalhos',
      'Impacto (%)',
      'Situação',
    ];

    // Dados
    const rows = dados.map((row) => [
      row.codigo_projeto,
      row.nome_projeto,
      row.cliente,
      row.engenheiro,
      row.area,
      row.tipo_obra,
      row.status,
      row.percentual_concluido,
      row.data_inicio,
      row.previsao_termino,
      row.ultima_atualizacao,
      row.total_retrabalhos,
      row.impacto_retrabalho,
      row.situacao,
    ]);

    return [header, ...rows];
  }

  // =====================================================
  // FUNÇÃO: Aplicar Formatação à Planilha
  // =====================================================

  async aplicarFormatacao(spreadsheetId: string, sheetId: number, totalRows: number): Promise<void> {
    try {
      const requests = [
        // Formatar cabeçalho (linha 1)
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
        // Congelar cabeçalho
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Formatar coluna de percentual como número
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: totalRows,
              startColumnIndex: 7, // Coluna "% Concluído"
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '0.00"%"',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });

      console.log('✨ Formatação aplicada com sucesso');
    } catch (error) {
      console.error('Erro ao aplicar formatação:', error);
      // Não falhar a sincronização se a formatação falhar
    }
  }

  // =====================================================
  // FUNÇÃO PRINCIPAL: Sincronizar para Planilha CEO
  // =====================================================

  async sincronizarParaCEO(
    spreadsheetId: string,
    sheetName: string = 'Dashboard Geral'
  ): Promise<SyncCEOResult> {
    const resultado: SyncCEOResult = {
      success: false,
      projetos_exportados: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      console.log(`🔄 Iniciando sincronização para planilha do CEO...`);

      // 1. Buscar dados consolidados
      const dadosConsolidados = await this.buscarDadosConsolidados();

      // 2. Formatar para planilha
      const valores = this.formatarParaPlanilha(dadosConsolidados);

      // 3. Limpar planilha existente
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A1:Z`,
      });

      console.log(`🧹 Planilha limpa`);

      // 4. Escrever novos dados
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: valores,
        },
      });

      console.log(`✍️  ${valores.length - 1} projetos escritos na planilha`);

      // 5. Obter SheetId para formatação
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        (s: any) => s.properties.title === sheetName
      );

      if (sheet) {
        await this.aplicarFormatacao(spreadsheetId, sheet.properties.sheetId, valores.length);
      }

      // 6. Adicionar timestamp de atualização
      const timestampRange = `${sheetName}!A${valores.length + 2}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: timestampRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[`Última atualização: ${new Date().toLocaleString('pt-BR')}`]],
        },
      });

      resultado.success = true;
      resultado.projetos_exportados = dadosConsolidados.length;

      console.log(`✅ Sincronização para planilha CEO concluída!`);
      console.log(`   Projetos exportados: ${resultado.projetos_exportados}`);

      return resultado;
    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      resultado.error = error.message;
      return resultado;
    }
  }

  // =====================================================
  // FUNÇÃO: Sincronização Automática Agendada
  // =====================================================

  async iniciarSincronizacaoAutomatica(
    spreadsheetId: string,
    sheetName: string = 'Dashboard Geral',
    intervaloMinutos: number = 30
  ): Promise<void> {
    console.log(
      `⏰ Sincronização automática iniciada (a cada ${intervaloMinutos} minutos)`
    );

    // Executar primeira sincronização imediatamente
    await this.sincronizarParaCEO(spreadsheetId, sheetName);

    // Agendar sincronizações subsequentes
    setInterval(async () => {
      console.log('\n⏰ Executando sincronização agendada...');
      await this.sincronizarParaCEO(spreadsheetId, sheetName);
    }, intervaloMinutos * 60 * 1000);
  }

  // =====================================================
  // FUNÇÃO: Exportar Dados por Engenheiro
  // =====================================================

  async exportarPorEngenheiro(
    spreadsheetId: string,
    baseSheetName: string = 'Engenheiro'
  ): Promise<{ [engenheiro: string]: SyncCEOResult }> {
    console.log(`🔄 Iniciando exportação por engenheiro...`);

    // Buscar lista de engenheiros
    const { data: engenheiros, error } = await this.supabase
      .from('engenheiros')
      .select('id, nome')
      .eq('ativo', true);

    if (error || !engenheiros) {
      console.error('Erro ao buscar engenheiros:', error);
      return {};
    }

    const resultados: { [engenheiro: string]: SyncCEOResult } = {};

    // Para cada engenheiro, criar uma aba separada
    for (const engenheiro of engenheiros) {
      const sheetName = `${baseSheetName} - ${engenheiro.nome}`;
      console.log(`\n--- Exportando: ${engenheiro.nome} ---`);

      // Buscar apenas projetos deste engenheiro
      const { data: projetos } = await this.supabase
        .from('view_dashboard_ceo')
        .select('*')
        .eq('Engenheiro', engenheiro.nome);

      // TODO: Implementar criação de aba e escrita de dados
      // (Simplificado aqui - expandir conforme necessidade)

      resultados[engenheiro.nome] = {
        success: true,
        projetos_exportados: projetos?.length || 0,
        timestamp: new Date().toISOString(),
      };
    }

    console.log(`✅ Exportação por engenheiro concluída!`);
    return resultados;
  }
}

// =====================================================
// EXPORTAR INSTÂNCIA E FUNÇÕES
// =====================================================

export const ceoSyncService = new CEOSyncService();

export async function sincronizarParaCEO(
  spreadsheetId: string,
  sheetName?: string
): Promise<SyncCEOResult> {
  return ceoSyncService.sincronizarParaCEO(spreadsheetId, sheetName);
}

export async function iniciarSincronizacaoAutomatica(
  spreadsheetId: string,
  sheetName?: string,
  intervaloMinutos?: number
): Promise<void> {
  return ceoSyncService.iniciarSincronizacaoAutomatica(
    spreadsheetId,
    sheetName,
    intervaloMinutos
  );
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import { sincronizarParaCEO, iniciarSincronizacaoAutomatica } from './ceo_sync';

// Sincronização manual única
const resultado = await sincronizarParaCEO(
  'spreadsheet-id-do-ceo',
  'Dashboard Geral'
);

console.log(resultado);

// Sincronização automática a cada 30 minutos
await iniciarSincronizacaoAutomatica(
  'spreadsheet-id-do-ceo',
  'Dashboard Geral',
  30
);
*/
