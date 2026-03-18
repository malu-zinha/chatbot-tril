// =====================================================
// EDGE FUNCTION: Registrar Retrabalho
// =====================================================
// Responsabilidade: Iza (Backend/APIs)
//
// Endpoint POST para registrar retrabalho em um projeto
// Recebe dados do chatbot, classifica motivo e grava no Supabase
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface RetrabalhoRequest {
  projeto_id: string;
  execucao_diaria_id?: string; // opcional: vincular a uma execução específica
  data?: string; // ISO date format, default: hoje
  motivo: string; // Ex: "Erro de Projeto", "Mudança de Escopo"
  categoria?: string; // Ex: "Técnico", "Cliente", "Fornecedor"
  descricao: string; // Descrição detalhada do retrabalho
  impacto_percentual?: number; // Quanto % foi perdido (0-100)
  tempo_perdido_horas?: number; // Horas de trabalho perdidas
  acao_corretiva?: string; // O que foi feito para corrigir
}

interface RetrabalhoResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// =====================================================
// MAPEAMENTO DE CATEGORIAS
// =====================================================

const CATEGORIAS_MOTIVOS: { [key: string]: string } = {
  // Técnicos
  'erro de projeto': 'Técnico',
  'erro de planejamento': 'Técnico',
  'problema técnico': 'Técnico',
  'falha de execução': 'Técnico',
  
  // Cliente
  'mudança de escopo': 'Cliente',
  'alteração de projeto': 'Cliente',
  'solicitação do cliente': 'Cliente',
  'mudança de requisitos': 'Cliente',
  
  // Fornecedor
  'problema de material': 'Fornecedor',
  'atraso de fornecedor': 'Fornecedor',
  'material incorreto': 'Fornecedor',
  'falta de material': 'Fornecedor',
  
  // Planejamento
  'falta de recursos': 'Planejamento',
  'mão de obra insuficiente': 'Planejamento',
  'cronograma inadequado': 'Planejamento',
  
  // Outros
  'condições climáticas': 'Externo',
  'problemas externos': 'Externo',
};

// =====================================================
// VALIDAÇÕES
// =====================================================

function validarRetrabalho(body: RetrabalhoRequest): { valid: boolean; error?: string } {
  // Validar projeto_id
  if (!body.projeto_id) {
    return { valid: false, error: 'projeto_id é obrigatório' };
  }

  // Validar motivo
  if (!body.motivo || body.motivo.trim() === '') {
    return { valid: false, error: 'motivo é obrigatório' };
  }

  // Validar descrição
  if (!body.descricao || body.descricao.trim() === '') {
    return { valid: false, error: 'descricao é obrigatória' };
  }

  // Validar impacto_percentual (se fornecido)
  if (body.impacto_percentual !== undefined && body.impacto_percentual !== null) {
    if (body.impacto_percentual < 0 || body.impacto_percentual > 100) {
      return { valid: false, error: 'impacto_percentual deve estar entre 0 e 100' };
    }
  }

  // Validar tempo_perdido_horas (se fornecido)
  if (body.tempo_perdido_horas !== undefined && body.tempo_perdido_horas !== null) {
    if (body.tempo_perdido_horas < 0) {
      return { valid: false, error: 'tempo_perdido_horas não pode ser negativo' };
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
// FUNÇÃO: Classificar Categoria Automaticamente
// =====================================================

function classificarCategoria(motivo: string, categoriaFornecida?: string): string {
  // Se categoria foi fornecida explicitamente, usar ela
  if (categoriaFornecida && categoriaFornecida.trim() !== '') {
    return categoriaFornecida;
  }

  // Tentar classificar automaticamente baseado no motivo
  const motivoLower = motivo.toLowerCase();
  
  for (const [chave, categoria] of Object.entries(CATEGORIAS_MOTIVOS)) {
    if (motivoLower.includes(chave)) {
      return categoria;
    }
  }

  // Categoria padrão se não encontrar match
  return 'Outro';
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
        } as RetrabalhoResponse),
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
    const body: RetrabalhoRequest = await req.json();
    console.log('Request recebido:', body);

    const validacao = validarRetrabalho(body);
    if (!validacao.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validacao.error,
        } as RetrabalhoResponse),
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
        } as RetrabalhoResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 5. CLASSIFICAR CATEGORIA AUTOMATICAMENTE
    // =====================================================
    const categoria = classificarCategoria(body.motivo, body.categoria);

    // =====================================================
    // 6. PREPARAR DADOS PARA INSERÇÃO
    // =====================================================
    const dataRetrabalho = body.data || new Date().toISOString().split('T')[0];

    const retrabalhoData = {
      projeto_id: body.projeto_id,
      execucao_diaria_id: body.execucao_diaria_id || null,
      data: dataRetrabalho,
      motivo: body.motivo,
      categoria: categoria,
      descricao: body.descricao,
      impacto_percentual: body.impacto_percentual || null,
      tempo_perdido_horas: body.tempo_perdido_horas || null,
      acao_corretiva: body.acao_corretiva || null,
      resolvido: false, // Novo retrabalho começa como não resolvido
    };

    // =====================================================
    // 7. INSERIR NO BANCO
    // =====================================================
    const { data: retrabalho, error: insertError } = await supabase
      .from('retrabalhos')
      .insert(retrabalhoData)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir retrabalho:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro ao salvar retrabalho no banco de dados',
          details: insertError.message,
        } as RetrabalhoResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 8. BUSCAR TOTAL DE RETRABALHOS DO PROJETO
    // =====================================================
    const { count: totalRetrabalhos } = await supabase
      .from('retrabalhos')
      .select('*', { count: 'exact', head: true })
      .eq('projeto_id', body.projeto_id);

    // =====================================================
    // 9. RETORNAR SUCESSO
    // =====================================================
    console.log('Retrabalho registrado com sucesso:', retrabalho);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Retrabalho registrado com sucesso',
        data: {
          id: retrabalho.id,
          projeto: projeto.nome,
          data: retrabalho.data,
          motivo: retrabalho.motivo,
          categoria: retrabalho.categoria,
          impacto_percentual: retrabalho.impacto_percentual,
          total_retrabalhos_projeto: totalRetrabalhos || 1,
        },
      } as RetrabalhoResponse),
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
      } as RetrabalhoResponse),
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
POST /registrarRetrabalho

Body:
{
  "projeto_id": "uuid-do-projeto",
  "data": "2024-01-15",  // opcional, default: hoje
  "motivo": "Erro de Projeto",  // obrigatório
  "categoria": "Técnico",  // opcional, será classificado automaticamente
  "descricao": "Erro no dimensionamento dos cabos elétricos",  // obrigatório
  "impacto_percentual": 5,  // opcional
  "tempo_perdido_horas": 8,  // opcional
  "acao_corretiva": "Refazer o cabeamento com dimensionamento correto"  // opcional
}

Response (sucesso):
{
  "success": true,
  "message": "Retrabalho registrado com sucesso",
  "data": {
    "id": "uuid-do-retrabalho",
    "projeto": "Nome do Projeto",
    "data": "2024-01-15",
    "motivo": "Erro de Projeto",
    "categoria": "Técnico",
    "impacto_percentual": 5,
    "total_retrabalhos_projeto": 3
  }
}

Response (erro):
{
  "success": false,
  "error": "Mensagem de erro"
}
*/
