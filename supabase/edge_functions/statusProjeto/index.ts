// =====================================================
// EDGE FUNCTION: Status do Projeto
// =====================================================
// Responsabilidade: Iza (Backend/APIs)
//
// Endpoint GET para consultar status de um projeto
// Retorna progresso acumulado, execuções recentes e retrabalhos
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface StatusResponse {
  success: boolean;
  message?: string;
  data?: {
    projeto: any;
    progresso: any;
    execucoes_recentes: any[];
    retrabalhos: any[];
    estatisticas: any;
  };
  error?: string;
}

// =====================================================
// HANDLER PRINCIPAL
// =====================================================

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // =====================================================
    // 1. VALIDAR MÉTODO HTTP
    // =====================================================
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Método não permitido. Use GET',
        } as StatusResponse),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 2. INICIALIZAR SUPABASE CLIENT
    // =====================================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // =====================================================
    // 3. EXTRAIR PARÂMETROS DA URL
    // =====================================================
    const url = new URL(req.url);
    const projeto_id = url.searchParams.get('projeto_id');
    const codigo = url.searchParams.get('codigo'); // Alternativa: buscar por código
    const detalhado = url.searchParams.get('detalhado') === 'true'; // Incluir mais detalhes

    if (!projeto_id && !codigo) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'É necessário fornecer projeto_id ou codigo como parâmetro',
        } as StatusResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 4. BUSCAR DADOS DO PROJETO
    // =====================================================
    let query = supabase
      .from('projetos')
      .select(`
        *,
        engenheiro:engenheiros (
          id,
          nome,
          whatsapp,
          email
        )
      `);

    if (projeto_id) {
      query = query.eq('id', projeto_id);
    } else if (codigo) {
      query = query.eq('codigo', codigo);
    }

    const { data: projeto, error: projetoError } = await query.single();

    if (projetoError || !projeto) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Projeto não encontrado',
        } as StatusResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 5. BUSCAR EXECUÇÕES RECENTES (últimos 7 dias)
    // =====================================================
    const { data: execucoesRecentes, error: execucoesError } = await supabase
      .from('execucao_diaria')
      .select('*')
      .eq('projeto_id', projeto.id)
      .order('data', { ascending: false })
      .limit(detalhado ? 30 : 7);

    if (execucoesError) {
      console.error('Erro ao buscar execuções:', execucoesError);
    }

    // =====================================================
    // 6. BUSCAR RETRABALHOS
    // =====================================================
    const { data: retrabalhos, error: retrabalhosError } = await supabase
      .from('retrabalhos')
      .select('*')
      .eq('projeto_id', projeto.id)
      .order('data', { ascending: false })
      .limit(detalhado ? 50 : 10);

    if (retrabalhosError) {
      console.error('Erro ao buscar retrabalhos:', retrabalhosError);
    }

    // =====================================================
    // 7. CALCULAR ESTATÍSTICAS
    // =====================================================

    // Total de dias registrados
    const { count: totalDiasRegistrados } = await supabase
      .from('execucao_diaria')
      .select('*', { count: 'exact', head: true })
      .eq('projeto_id', projeto.id);

    // Total de retrabalhos
    const totalRetrabalhos = retrabalhos?.length || 0;

    // Impacto total de retrabalhos
    const impactoTotalRetrabalho = retrabalhos?.reduce(
      (acc, r) => acc + (r.impacto_percentual || 0),
      0
    ) || 0;

    // Tempo total perdido
    const tempoTotalPerdido = retrabalhos?.reduce(
      (acc, r) => acc + (r.tempo_perdido_horas || 0),
      0
    ) || 0;

    // Média de execução diária
    const mediaExecucaoDiaria = execucoesRecentes?.length
      ? execucoesRecentes.reduce((acc, e) => acc + (e.percentual_realizado || 0), 0) /
        execucoesRecentes.length
      : 0;

    // Última atualização
    const ultimaAtualizacao = execucoesRecentes?.[0]?.data || null;

    // Calcular dias restantes (se tiver data de previsão)
    let diasRestantes = null;
    if (projeto.data_previsao_termino) {
      const hoje = new Date();
      const previsao = new Date(projeto.data_previsao_termino);
      diasRestantes = Math.ceil((previsao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Tendência de execução
    let tendencia = 'estável';
    if (execucoesRecentes && execucoesRecentes.length >= 3) {
      const ultimas3 = execucoesRecentes.slice(0, 3);
      const mediaRecente = ultimas3.reduce((acc, e) => acc + e.percentual_realizado, 0) / 3;
      
      if (mediaRecente > mediaExecucaoDiaria + 2) {
        tendencia = 'acelerando';
      } else if (mediaRecente < mediaExecucaoDiaria - 2) {
        tendencia = 'desacelerando';
      }
    }

    // =====================================================
    // 8. MONTAR RESPOSTA
    // =====================================================
    const estatisticas = {
      percentual_total: projeto.percentual_total,
      total_dias_registrados: totalDiasRegistrados || 0,
      total_retrabalhos: totalRetrabalhos,
      impacto_total_retrabalho: impactoTotalRetrabalho,
      tempo_total_perdido_horas: tempoTotalPerdido,
      media_execucao_diaria: Math.round(mediaExecucaoDiaria * 100) / 100,
      ultima_atualizacao: ultimaAtualizacao,
      dias_restantes: diasRestantes,
      tendencia: tendencia,
      fase: projeto.percentual_total >= 100 ? 'Concluído' :
             projeto.percentual_total >= 75 ? 'Em Fase Final' :
             projeto.percentual_total >= 50 ? 'Em Andamento' :
             projeto.percentual_total >= 25 ? 'Em Início' : 'Iniciando',
    };

    // =====================================================
    // 9. RETORNAR SUCESSO
    // =====================================================
    console.log('Status do projeto consultado com sucesso:', projeto.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          projeto: {
            id: projeto.id,
            codigo: projeto.codigo,
            nome: projeto.nome,
            cliente: projeto.cliente,
            area: projeto.area,
            tipo_obra: projeto.tipo_obra,
            status: projeto.status,
            data_inicio: projeto.data_inicio,
            data_previsao_termino: projeto.data_previsao_termino,
            engenheiro: projeto.engenheiro,
          },
          progresso: {
            percentual_total: projeto.percentual_total,
            fase: estatisticas.fase,
            tendencia: estatisticas.tendencia,
          },
          execucoes_recentes: execucoesRecentes || [],
          retrabalhos: retrabalhos || [],
          estatisticas: estatisticas,
        },
      } as StatusResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // =====================================================
    // TRATAMENTO DE ERROS GERAIS
    // =====================================================
    console.error('Erro não tratado:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message,
      } as StatusResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// =====================================================
// EXEMPLO DE USO (REQUEST)
// =====================================================
/*
GET /statusProjeto?projeto_id=uuid-do-projeto
GET /statusProjeto?codigo=PRJ-001
GET /statusProjeto?projeto_id=uuid-do-projeto&detalhado=true

Response (sucesso):
{
  "success": true,
  "data": {
    "projeto": {
      "id": "uuid",
      "codigo": "PRJ-001",
      "nome": "Instalação Elétrica Prédio A",
      "cliente": "Construtora ABC",
      "area": "Elétrico",
      "tipo_obra": "Predial",
      "status": "Em Execução",
      "data_inicio": "2024-01-01",
      "data_previsao_termino": "2024-03-30",
      "engenheiro": {
        "id": "uuid",
        "nome": "João Silva",
        "whatsapp": "+5511999999999",
        "email": "joao@example.com"
      }
    },
    "progresso": {
      "percentual_total": 45.5,
      "fase": "Em Andamento",
      "tendencia": "acelerando"
    },
    "execucoes_recentes": [
      {
        "data": "2024-01-15",
        "percentual_previsto": 10,
        "percentual_realizado": 8,
        "percentual_acumulado": 45.5,
        "observacoes": "..."
      }
    ],
    "retrabalhos": [
      {
        "data": "2024-01-14",
        "motivo": "Erro de Projeto",
        "categoria": "Técnico",
        "impacto_percentual": 5,
        "descricao": "..."
      }
    ],
    "estatisticas": {
      "percentual_total": 45.5,
      "total_dias_registrados": 15,
      "total_retrabalhos": 2,
      "impacto_total_retrabalho": 8,
      "tempo_total_perdido_horas": 16,
      "media_execucao_diaria": 7.5,
      "ultima_atualizacao": "2024-01-15",
      "dias_restantes": 75,
      "tendencia": "acelerando",
      "fase": "Em Andamento"
    }
  }
}

Response (erro):
{
  "success": false,
  "error": "Mensagem de erro"
}
*/
