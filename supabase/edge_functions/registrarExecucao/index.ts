// =====================================================
// EDGE FUNCTION: Registrar Execução Diária
// =====================================================
// Responsabilidade: Iza (Backend/APIs)
//
// Endpoint POST para registrar execução diária de um projeto
// Recebe dados do chatbot e grava no Supabase
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface ExecucaoRequest {
  projeto_id: string;
  data?: string; // ISO date format, default: hoje
  percentual_previsto?: number; // 0-100
  percentual_realizado: number; // 0-100 (obrigatório)
  observacoes?: string;
}

interface ExecucaoResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// =====================================================
// VALIDAÇÕES
// =====================================================

function validarExecucao(body: ExecucaoRequest): { valid: boolean; error?: string } {
  // Validar projeto_id
  if (!body.projeto_id) {
    return { valid: false, error: 'projeto_id é obrigatório' };
  }

  // Validar percentual_realizado
  if (body.percentual_realizado === undefined || body.percentual_realizado === null) {
    return { valid: false, error: 'percentual_realizado é obrigatório' };
  }

  if (body.percentual_realizado < 0 || body.percentual_realizado > 100) {
    return { valid: false, error: 'percentual_realizado deve estar entre 0 e 100' };
  }

  // Validar percentual_previsto (se fornecido)
  if (body.percentual_previsto !== undefined && body.percentual_previsto !== null) {
    if (body.percentual_previsto < 0 || body.percentual_previsto > 100) {
      return { valid: false, error: 'percentual_previsto deve estar entre 0 e 100' };
    }
  }

  // Validar data (se fornecida)
  if (body.data) {
    const dataObj = new Date(body.data);
    if (isNaN(dataObj.getTime())) {
      return { valid: false, error: 'data inválida. Use formato ISO (YYYY-MM-DD)' };
    }
  }

  return { valid: true };
}

// =====================================================
// FUNÇÃO PRINCIPAL: Calcular Percentual Acumulado
// =====================================================

async function calcularPercentualAcumulado(
  supabase: any,
  projeto_id: string,
  data: string
): Promise<number> {
  // Buscar todas as execuções anteriores + a atual
  const { data: execucoes, error } = await supabase
    .from('execucao_diaria')
    .select('percentual_realizado')
    .eq('projeto_id', projeto_id)
    .lte('data', data)
    .order('data', { ascending: true });

  if (error) {
    console.error('Erro ao buscar execuções:', error);
    return 0;
  }

  // Somar todos os percentuais realizados
  const total = execucoes.reduce(
    (acc: number, exec: any) => acc + (exec.percentual_realizado || 0),
    0
  );

  // Garantir que não ultrapasse 100%
  return Math.min(total, 100);
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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Método não permitido. Use POST',
        } as ExecucaoResponse),
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
    // 3. PARSEAR E VALIDAR REQUEST BODY
    // =====================================================
    const body: ExecucaoRequest = await req.json();
    console.log('Request recebido:', body);

    const validacao = validarExecucao(body);
    if (!validacao.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validacao.error,
        } as ExecucaoResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 4. VERIFICAR SE PROJETO EXISTE
    // =====================================================
    const { data: projeto, error: projetoError } = await supabase
      .from('projetos')
      .select('id, nome, codigo')
      .eq('id', body.projeto_id)
      .single();

    if (projetoError || !projeto) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Projeto não encontrado',
        } as ExecucaoResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 5. PREPARAR DADOS PARA INSERÇÃO
    // =====================================================
    const dataExecucao = body.data || new Date().toISOString().split('T')[0];

    // Calcular percentual acumulado
    const percentualAcumulado = await calcularPercentualAcumulado(
      supabase,
      body.projeto_id,
      dataExecucao
    );

    const execucaoData = {
      projeto_id: body.projeto_id,
      data: dataExecucao,
      percentual_previsto: body.percentual_previsto || null,
      percentual_realizado: body.percentual_realizado,
      percentual_acumulado: percentualAcumulado + body.percentual_realizado,
      observacoes: body.observacoes || null,
      notificacao_enviada: false,
    };

    // =====================================================
    // 6. INSERIR OU ATUALIZAR NO BANCO
    // =====================================================
    const { data: execucao, error: insertError } = await supabase
      .from('execucao_diaria')
      .upsert(execucaoData, {
        onConflict: 'projeto_id,data', // Atualiza se já existe registro para este projeto nesta data
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir execução:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro ao salvar execução no banco de dados',
          details: insertError.message,
        } as ExecucaoResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 7. RETORNAR SUCESSO
    // =====================================================
    console.log('Execução registrada com sucesso:', execucao);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Execução registrada com sucesso',
        data: {
          id: execucao.id,
          projeto: projeto.nome,
          data: execucao.data,
          percentual_realizado: execucao.percentual_realizado,
          percentual_acumulado: execucao.percentual_acumulado,
        },
      } as ExecucaoResponse),
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
      } as ExecucaoResponse),
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
POST /registrarExecucao

Body:
{
  "projeto_id": "uuid-do-projeto",
  "data": "2024-01-15",  // opcional, default: hoje
  "percentual_previsto": 10,  // opcional
  "percentual_realizado": 8,  // obrigatório
  "observacoes": "Atraso devido à chuva"  // opcional
}

Response (sucesso):
{
  "success": true,
  "message": "Execução registrada com sucesso",
  "data": {
    "id": "uuid-da-execucao",
    "projeto": "Nome do Projeto",
    "data": "2024-01-15",
    "percentual_realizado": 8,
    "percentual_acumulado": 45
  }
}

Response (erro):
{
  "success": false,
  "error": "Mensagem de erro"
}
*/
