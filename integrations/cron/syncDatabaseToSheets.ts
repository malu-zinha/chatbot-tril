// =====================================================
// SINCRONIZAÇÃO: Supabase → Google Sheets
// =====================================================
// Sincroniza dados do banco de dados para as planilhas
// Roda periodicamente via cron job
// =====================================================

import cron from 'node-cron';
import { getSupabaseService } from '../supabase/supabaseService.ts';
import { getGoogleSheetsService } from '../sheets/googleSheetsService.ts';
import dotenv from 'dotenv';

dotenv.config();

// =====================================================
// CONFIGURAÇÃO
// =====================================================

interface SheetConfig {
  id: string;
  name: string;
  range: string;
  engenheiroWhatsapp?: string; // Filtro por engenheiro (opcional)
}

// Configurar planilhas a sincronizar
const SHEETS_CONFIG: SheetConfig[] = [];

// COMPATIBILIDADE: Usar variável antiga se nova não existir
const engineerSheetId = process.env.GOOGLE_SHEETS_ENG1_ID || process.env.GOOGLE_SHEETS_ENGINEER_ID;
const engineerSheetName = process.env.GOOGLE_SHEETS_ENG1_NAME || process.env.GOOGLE_SHEETS_ENGINEER_NAME || process.env.GOOGLE_SHEETS_ENGINEER_SHEET || 'Engenheiro(a)';
const engineerSheetRange = process.env.GOOGLE_SHEETS_ENG1_RANGE || process.env.GOOGLE_SHEETS_ENGINEER_RANGE || 'A2:AE1000';
const engineerWhatsapp = process.env.GOOGLE_SHEETS_ENG1_WHATSAPP;

// Planilha 1: Engenheiro principal (usa ID antigo ou novo)
if (engineerSheetId) {
  SHEETS_CONFIG.push({
    id: engineerSheetId,
    name: engineerSheetName,
    range: engineerSheetRange,
    engenheiroWhatsapp: engineerWhatsapp // Opcional - se não tiver, mostra todos
  });
}

// Planilha 2: Engenheiro adicional (opcional)
if (process.env.GOOGLE_SHEETS_ENG2_ID) {
  SHEETS_CONFIG.push({
    id: process.env.GOOGLE_SHEETS_ENG2_ID,
    name: process.env.GOOGLE_SHEETS_ENG2_NAME || 'Engenheiro(a)',
    range: process.env.GOOGLE_SHEETS_ENG2_RANGE || 'A2:AE1000',
    engenheiroWhatsapp: process.env.GOOGLE_SHEETS_ENG2_WHATSAPP
  });
}

// Planilha 3: Engenheiro adicional (opcional)
if (process.env.GOOGLE_SHEETS_ENG3_ID) {
  SHEETS_CONFIG.push({
    id: process.env.GOOGLE_SHEETS_ENG3_ID,
    name: process.env.GOOGLE_SHEETS_ENG3_NAME || 'Engenheiro(a)',
    range: process.env.GOOGLE_SHEETS_ENG3_RANGE || 'A2:AE1000',
    engenheiroWhatsapp: process.env.GOOGLE_SHEETS_ENG3_WHATSAPP
  });
}

// Planilha CEO (dashboard consolidado) - opcional
const CEO_SHEET_CONFIG: SheetConfig | null = process.env.GOOGLE_SHEETS_CEO_ID ? {
  id: process.env.GOOGLE_SHEETS_CEO_ID,
  name: process.env.GOOGLE_SHEETS_CEO_NAME || 'Dashboard',
  range: process.env.GOOGLE_SHEETS_CEO_RANGE || 'A2:Z1000'
} : null;

// =====================================================
// FUNÇÕES DE SINCRONIZAÇÃO
// =====================================================

/**
 * Sincroniza projetos do Supabase para uma planilha específica
 */
async function syncProjetosParaPlanilha(config: SheetConfig): Promise<void> {
  try {
    console.log(`🔄 Sincronizando: ${config.id.substring(0, 10)}...`);
    
    const supabase = getSupabaseService();
    const sheets = getGoogleSheetsService();

    if (!supabase.isConnected()) {
      console.log('   ⚠️  Supabase não conectado - pulando sincronização');
      return;
    }

    // 1. Buscar dados do Supabase
    let query = `
      SELECT 
        p.*,
        e.nome as engenheiro_nome,
        e.whatsapp as engenheiro_whatsapp,
        (
          SELECT previsao_dia 
          FROM atualizacoes_diarias 
          WHERE projeto_id = p.id 
          ORDER BY data DESC 
          LIMIT 1
        ) as ultima_previsao,
        (
          SELECT feito_dia 
          FROM atualizacoes_diarias 
          WHERE projeto_id = p.id 
          ORDER BY data DESC 
          LIMIT 1
        ) as ultimo_feito,
        (
          SELECT necessitou_retrabalho 
          FROM atualizacoes_diarias 
          WHERE projeto_id = p.id 
          ORDER BY data DESC 
          LIMIT 1
        ) as ultimo_retrabalho,
        (
          SELECT motivo_revisao 
          FROM atualizacoes_diarias 
          WHERE projeto_id = p.id 
          ORDER BY data DESC 
          LIMIT 1
        ) as ultimo_motivo_retrabalho,
        (
          SELECT data 
          FROM atualizacoes_diarias 
          WHERE projeto_id = p.id AND necessitou_retrabalho = true
          ORDER BY data DESC 
          LIMIT 1
        ) as ultima_data_retrabalho,
        (
          SELECT observacoes 
          FROM atualizacoes_diarias 
          WHERE projeto_id = p.id 
          ORDER BY data DESC 
          LIMIT 1
        ) as ultimas_observacoes
      FROM projetos p
      LEFT JOIN engenheiros e ON p.engenheiro_id = e.id
      WHERE p.ativo = true
    `;

    // Filtrar por engenheiro se especificado
    if (config.engenheiroWhatsapp) {
      query += ` AND e.whatsapp = '${config.engenheiroWhatsapp}'`;
    }

    query += ` ORDER BY p.created_at DESC`;

    // Executar query (usando método nativo do Supabase)
    const { data: projetos, error } = await supabase['supabase']
      .from('projetos')
      .select(`
        *,
        engenheiro:engenheiros(nome, whatsapp)
      `)
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('   ❌ Erro ao buscar projetos:', error);
      return;
    }

    if (!projetos || projetos.length === 0) {
      console.log('   ℹ️  Nenhum projeto encontrado');
      return;
    }

    // 2. Formatar dados para planilha (31 colunas)
    const rows: any[][] = [];

    for (const proj of projetos) {
      // Filtrar por engenheiro se necessário
      if (config.engenheiroWhatsapp && 
          proj.engenheiro?.whatsapp !== config.engenheiroWhatsapp) {
        continue;
      }

      // Buscar última atualização diária
      const { data: ultimaAtualizacao } = await supabase['supabase']
        .from('atualizacoes_diarias')
        .select('*')
        .eq('projeto_id', proj.id)
        .order('data', { ascending: false })
        .limit(1)
        .single();

      // Montar linha com as 31 colunas (A-AE)
      const row = [
        proj.codigo || '',                                      // A - Código do Projeto
        proj.cliente || '',                                     // B - Cliente
        proj.contato_cliente || '',                             // C - Contato
        proj.tipo_obra || '',                                   // D - Obra
        proj.area || '',                                        // E - Área
        proj.engenheiro?.nome || '',                            // F - Eng. Responsável
        proj.tipo_projeto || '',                                // G - Tipo de Projeto
        proj.descricao_projeto || '',                           // H - Descrição do projeto
        proj.complexidade || '',                                // I - Complexidade
        proj.dias_estimados_interno || '',                      // J - Dias estimados (interno)
        supabase.formatarDataParaExibicao(proj.data_inicio),   // K - Data de Início
        supabase.formatarDataParaExibicao(proj.data_previsao_termino), // L - Data de Previsão
        supabase.formatarDataParaExibicao(proj.data_final_cliente),    // M - Data Final Cliente
        proj.prazo_interno_dias || '',                          // N - Prazo Interno (dias úteis)
        proj.prazo_cliente_dias || '',                          // O - Prazo Cliente (dias úteis)
        proj.dias_atraso || '0',                                // P - Dias de atraso
        proj.status || '',                                      // Q - Status do projeto
        ultimaAtualizacao?.previsao_dia || '',                  // R - Previsão para o dia
        ultimaAtualizacao?.feito_dia || '',                     // S - Feito ao final do dia
        ultimaAtualizacao?.necessitou_retrabalho ? 'sim' : 'não', // T - Necessitou de retrabalho?
        ultimaAtualizacao?.motivo_revisao || '',                // U - motivo da revisão
        supabase.formatarDataParaExibicao(
          ultimaAtualizacao?.necessitou_retrabalho ? 
            ultimaAtualizacao.data : null
        ),                                                      // V - Data do registro do retrabalho
        proj.etapa_atual || '',                                 // W - Etapa
        proj.percentual_total || '0',                           // X - % executado
        ultimaAtualizacao?.observacoes || proj.observacoes || '', // Y - Observações
        proj.metrica_retrabalho || '0',                         // Z - Métrica de retrabalho
        proj.dias_estimados_interno || '',                      // AA - Dias estimados (dias úteis) [duplicado]
        supabase.formatarDataParaExibicao(proj.data_entrega_real), // AB - Data de entrega real
        proj.lead_time_dias || '',                              // AC - Lead Time (dias úteis)
        proj.dias_parado_cliente || '0',                        // AD - Dias Parado cliente
        proj.dias_parado_tecpred || '0'                         // AE - Dias parado TecPred
      ];

      rows.push(row);
    }

    // 3. Limpar planilha atual (exceto headers)
    const fullRange = `${config.name}!${config.range}`;
    await sheets.clearSheet(config.id, fullRange);

    // 4. Escrever novos dados
    if (rows.length > 0) {
      await sheets.writeSheet(config.id, fullRange, rows);
      console.log(`   ✅ ${rows.length} projeto(s) sincronizado(s)`);
    } else {
      console.log(`   ℹ️  Nenhum projeto para sincronizar`);
    }

  } catch (error: any) {
    console.error(`   ❌ Erro na sincronização:`, error.message);
  }
}

/**
 * Sincroniza dashboard consolidado para planilha CEO
 */
async function syncDashboardCEO(): Promise<void> {
  if (!CEO_SHEET_CONFIG) {
    return; // CEO sheet não configurado
  }

  try {
    console.log(`🔄 Sincronizando dashboard CEO...`);
    
    const supabase = getSupabaseService();
    const sheets = getGoogleSheetsService();

    if (!supabase.isConnected()) {
      console.log('   ⚠️  Supabase não conectado');
      return;
    }

    // Usar view consolidada do banco
    const { data: projetos, error } = await supabase['supabase']
      .from('view_projetos_completo')
      .select('*')
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('   ❌ Erro ao buscar dashboard:', error);
      return;
    }

    if (!projetos || projetos.length === 0) {
      console.log('   ℹ️  Nenhum dado para dashboard');
      return;
    }

    // Formatar dados para dashboard CEO (colunas resumidas)
    const rows = projetos.map((proj: any) => [
      proj.codigo || '',
      proj.cliente || '',
      proj.engenheiro_nome || '',
      proj.area || '',
      proj.status || '',
      proj.percentual_total || '0',
      proj.etapa_atual || '',
      supabase.formatarDataParaExibicao(proj.data_inicio),
      supabase.formatarDataParaExibicao(proj.data_previsao_termino),
      proj.dias_atraso || '0',
      proj.metrica_retrabalho || '0'
    ]);

    // Limpar e escrever
    const fullRange = `${CEO_SHEET_CONFIG.name}!${CEO_SHEET_CONFIG.range}`;
    await sheets.clearSheet(CEO_SHEET_CONFIG.id, fullRange);
    await sheets.writeSheet(CEO_SHEET_CONFIG.id, fullRange, rows);

    console.log(`   ✅ Dashboard CEO atualizado (${rows.length} projetos)`);

  } catch (error: any) {
    console.error(`   ❌ Erro no dashboard CEO:`, error.message);
  }
}

/**
 * Executa sincronização completa
 */
export async function executarSincronizacao(): Promise<void> {
  console.log('\n🔄 ========== SINCRONIZAÇÃO INICIADA ==========');
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}\n`);

  // Sincronizar cada planilha de engenheiro
  for (const config of SHEETS_CONFIG) {
    await syncProjetosParaPlanilha(config);
  }

  // Sincronizar dashboard CEO
  if (CEO_SHEET_CONFIG) {
    await syncDashboardCEO();
  }

  console.log('\n✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========\n');
}

/**
 * Configura cron job para sincronização automática
 */
export function iniciarSincronizacaoAutomatica(): void {
  console.log('⏰ Configurando sincronização automática...\n');

  // Executar a cada 5 minutos: */5 * * * *
  // Executar a cada 10 minutos: */10 * * * *
  // Executar a cada hora: 0 * * * *
  
  const cronExpression = process.env.SYNC_CRON_SCHEDULE || '*/5 * * * *';
  
  console.log(`📅 Agendamento: ${cronExpression}`);
  console.log(`   (a cada 5 minutos)\n`);

  // Executar sincronização imediatamente ao iniciar
  console.log('🚀 Executando primeira sincronização...');
  executarSincronizacao().catch(error => {
    console.error('❌ Erro na primeira sincronização:', error);
  });

  // Agendar sincronizações periódicas
  cron.schedule(cronExpression, () => {
    executarSincronizacao().catch(error => {
      console.error('❌ Erro na sincronização automática:', error);
    });
  });

  console.log('✅ Sincronização automática ativada!\n');
}

// Se executado diretamente (não importado)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Modo de teste: Executando sincronização única\n');
  executarSincronizacao()
    .then(() => {
      console.log('\n✅ Teste concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no teste:', error);
      process.exit(1);
    });
}

