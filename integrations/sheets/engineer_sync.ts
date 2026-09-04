// =====================================================
// ⚠️  ARQUIVO DESATIVADO — NÃO USAR
// =====================================================
// Este módulo usa um schema antigo do Supabase que não
// existe mais (colunas: id, whatsapp, engenheiro_id, etc).
// O schema atual usa: eng_id, telefone, projeto_id,
// codigo_projeto, e relação N:N via engenheiros_projetos.
//
// Se precisar reativar, reescrever para o schema atual.
// Verificado em 2026-04-07: nenhum outro módulo importa
// este arquivo.
// =====================================================
// INTEGRAÇÃO: Sincronização Planilhas Engenheiros → Supabase
// =====================================================
// Responsabilidade: Iza (Integrações)
//
// Este módulo sincroniza dados das planilhas individuais
// dos engenheiros para o banco de dados Supabase
// =====================================================

import { google } from 'googleapis';
import {
  ClienteSupabaseValidado,
  criarClienteSupabaseValidado,
  exigirClienteSupabase,
} from '../supabase/createValidatedClient.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface EngineerSheetData {
  codigo: string;
  nome: string;
  cliente: string;
  area: string;
  tipo_obra: string;
  status: string;
  percentual_total: number;
  data_inicio?: string;
  data_previsao_termino?: string;
  observacoes?: string;
}

interface SyncResult {
  success: boolean;
  projetos_sincronizados: number;
  projetos_criados: number;
  projetos_atualizados: number;
  erros: string[];
}

// =====================================================
// CONFIGURAÇÃO
// =====================================================

class EngineerSyncService {
  private supabase: ClienteSupabaseValidado | null;
  private sheets: any;

  constructor() {
    // Inicializar Supabase — ver comentário em criarClienteSupabaseValidado.
    this.supabase = criarClienteSupabaseValidado('EngineerSyncService');

    // Inicializar Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Cliente Supabase garantido. Se as credenciais faltaram no boot, falha aqui
   * com mensagem clara em vez de um null deref na primeira query.
   */
  private get db(): ClienteSupabaseValidado {
    return exigirClienteSupabase(this.supabase, 'EngineerSyncService');
  }

  // =====================================================
  // FUNÇÃO: Buscar Dados da Planilha do Engenheiro
  // =====================================================

  async buscarDadosPlanilha(
    spreadsheetId: string,
    sheetName: string = 'Projetos'
  ): Promise<EngineerSheetData[]> {
    try {
      const range = `${sheetName}!A2:Z`; // A partir da linha 2 (ignora cabeçalho)

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values || [];

      // Mapear dados da planilha para objeto tipado
      // Assumindo estrutura: [Código, Nome, Cliente, Área, Tipo, Status, %, Data Início, Previsão, Obs]
      const projetos: EngineerSheetData[] = rows
        .filter((row: any[]) => row.length > 0 && row[0]) // Filtrar linhas vazias
        .map((row: any[]) => ({
          codigo: row[0] || '',
          nome: row[1] || '',
          cliente: row[2] || '',
          area: row[3] || '',
          tipo_obra: row[4] || '',
          status: row[5] || 'Em Planejamento',
          percentual_total: parseFloat(row[6]) || 0,
          data_inicio: row[7] || null,
          data_previsao_termino: row[8] || null,
          observacoes: row[9] || null,
        }));

      return projetos;
    } catch (error) {
      console.error('Erro ao buscar dados da planilha:', error);
      throw error;
    }
  }

  // =====================================================
  // FUNÇÃO: Buscar Engenheiro por WhatsApp
  // =====================================================

  async buscarEngenheiroPorWhatsapp(whatsapp: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('engenheiros')
      .select('id')
      .eq('whatsapp', whatsapp)
      .single();

    if (error || !data) {
      console.error('Engenheiro não encontrado:', whatsapp);
      return null;
    }

    return data.id;
  }

  // =====================================================
  // FUNÇÃO: Sincronizar Projeto Individual
  // =====================================================

  async sincronizarProjeto(
    projeto: EngineerSheetData,
    engenheiro_id: string
  ): Promise<{ created: boolean; updated: boolean; error?: string }> {
    try {
      // Verificar se projeto já existe (por código)
      const { data: projetoExistente, error: searchError } = await this.db
        .from('projetos')
        .select('id, percentual_total')
        .eq('codigo', projeto.codigo)
        .eq('engenheiro_id', engenheiro_id)
        .maybeSingle();

      if (searchError) {
        return { created: false, updated: false, error: searchError.message };
      }

      const projetoData = {
        codigo: projeto.codigo,
        nome: projeto.nome,
        cliente: projeto.cliente,
        engenheiro_id: engenheiro_id,
        area: projeto.area,
        tipo_obra: projeto.tipo_obra,
        status: projeto.status,
        percentual_total: projeto.percentual_total,
        data_inicio: projeto.data_inicio || null,
        data_previsao_termino: projeto.data_previsao_termino || null,
        observacoes: projeto.observacoes || null,
      };

      if (projetoExistente) {
        // ATUALIZAR projeto existente
        const { error: updateError } = await this.db
          .from('projetos')
          .update(projetoData)
          .eq('id', projetoExistente.id);

        if (updateError) {
          return { created: false, updated: false, error: updateError.message };
        }

        console.log(`✅ Projeto atualizado: ${projeto.codigo} - ${projeto.nome}`);
        return { created: false, updated: true };
      } else {
        // CRIAR novo projeto
        const { error: insertError } = await this.db
          .from('projetos')
          .insert(projetoData);

        if (insertError) {
          return { created: false, updated: false, error: insertError.message };
        }

        console.log(`✨ Projeto criado: ${projeto.codigo} - ${projeto.nome}`);
        return { created: true, updated: false };
      }
    } catch (error: any) {
      return { created: false, updated: false, error: error.message };
    }
  }

  // =====================================================
  // FUNÇÃO PRINCIPAL: Sincronizar Planilha Completa
  // =====================================================

  async sincronizarPlanilhaEngenheiro(
    whatsapp: string,
    spreadsheetId: string,
    sheetName: string = 'Projetos'
  ): Promise<SyncResult> {
    const resultado: SyncResult = {
      success: false,
      projetos_sincronizados: 0,
      projetos_criados: 0,
      projetos_atualizados: 0,
      erros: [],
    };

    try {
      console.log(`🔄 Iniciando sincronização da planilha do engenheiro ${whatsapp}...`);

      // 1. Buscar ID do engenheiro
      const engenheiro_id = await this.buscarEngenheiroPorWhatsapp(whatsapp);
      if (!engenheiro_id) {
        resultado.erros.push('Engenheiro não encontrado no banco de dados');
        return resultado;
      }

      // 2. Buscar dados da planilha
      const projetos = await this.buscarDadosPlanilha(spreadsheetId, sheetName);
      console.log(`📊 ${projetos.length} projetos encontrados na planilha`);

      // 3. Sincronizar cada projeto
      for (const projeto of projetos) {
        const result = await this.sincronizarProjeto(projeto, engenheiro_id);

        if (result.error) {
          resultado.erros.push(`${projeto.codigo}: ${result.error}`);
        } else {
          resultado.projetos_sincronizados++;
          if (result.created) resultado.projetos_criados++;
          if (result.updated) resultado.projetos_atualizados++;
        }
      }

      // 4. Verificar sucesso
      resultado.success = resultado.erros.length === 0;

      console.log(`✅ Sincronização concluída!`);
      console.log(`   Total sincronizado: ${resultado.projetos_sincronizados}`);
      console.log(`   Criados: ${resultado.projetos_criados}`);
      console.log(`   Atualizados: ${resultado.projetos_atualizados}`);
      if (resultado.erros.length > 0) {
        console.log(`   Erros: ${resultado.erros.length}`);
      }

      return resultado;
    } catch (error: any) {
      resultado.erros.push(`Erro geral: ${error.message}`);
      return resultado;
    }
  }

  // =====================================================
  // FUNÇÃO: Sincronizar Todos os Engenheiros
  // =====================================================

  async sincronizarTodosEngenheiros(
    mapeamento: { whatsapp: string; spreadsheetId: string; sheetName?: string }[]
  ): Promise<{ [whatsapp: string]: SyncResult }> {
    console.log(`🚀 Iniciando sincronização de ${mapeamento.length} engenheiros...`);

    const resultados: { [whatsapp: string]: SyncResult } = {};

    for (const config of mapeamento) {
      console.log(`\n--- Engenheiro: ${config.whatsapp} ---`);
      resultados[config.whatsapp] = await this.sincronizarPlanilhaEngenheiro(
        config.whatsapp,
        config.spreadsheetId,
        config.sheetName || 'Projetos'
      );
    }

    console.log(`\n✅ Sincronização de todos os engenheiros concluída!`);
    return resultados;
  }
}

// =====================================================
// EXPORTAR INSTÂNCIA E FUNÇÕES
// =====================================================

export const engineerSyncService = new EngineerSyncService();

export async function sincronizarEngenheiro(
  whatsapp: string,
  spreadsheetId: string,
  sheetName?: string
): Promise<SyncResult> {
  return engineerSyncService.sincronizarPlanilhaEngenheiro(whatsapp, spreadsheetId, sheetName);
}

export async function sincronizarTodos(
  mapeamento: { whatsapp: string; spreadsheetId: string; sheetName?: string }[]
): Promise<{ [whatsapp: string]: SyncResult }> {
  return engineerSyncService.sincronizarTodosEngenheiros(mapeamento);
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import { sincronizarEngenheiro, sincronizarTodos } from './engineer_sync';

// Sincronizar um engenheiro específico
const resultado = await sincronizarEngenheiro(
  '+5511999999999',
  'spreadsheet-id-do-engenheiro',
  'Projetos'
);

console.log(resultado);

// Sincronizar múltiplos engenheiros
const resultados = await sincronizarTodos([
  { 
    whatsapp: '+5511999999999', 
    spreadsheetId: 'spreadsheet-id-1',
    sheetName: 'Projetos'
  },
  { 
    whatsapp: '+5511988888888', 
    spreadsheetId: 'spreadsheet-id-2',
    sheetName: 'MeusProjetos'
  },
]);

console.log(resultados);
*/
