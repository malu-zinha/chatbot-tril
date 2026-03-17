// =====================================================
// HANDLER PRINCIPAL: Mensagens do Chatbot
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo orquestra todos os fluxos conversacionais
// e decide qual fluxo ativar baseado na mensagem do usuário
// E TAMBÉM faz autenticação por número de WhatsApp
// =====================================================

// Flows ativos
import { EngineerProjectFlow } from '../flows/engineerProjectFlow.ts';
import { NotificacaoMatinalFlow, NotificacaoNoturnaFlow } from '../flows/notificationFlows.ts';
import { OwnerFlow } from '../flows/ownerFlow.ts';

// Supabase para autenticação (lazy loading para evitar problemas com dotenv)
import { getSupabaseService, SupabaseService } from '../../integrations/supabase/supabaseService.ts';

// Lazy loading: criar instância apenas quando necessário
let supabaseServiceInstance: SupabaseService | null = null;
function getSupabase(): SupabaseService {
  if (!supabaseServiceInstance) {
    supabaseServiceInstance = getSupabaseService();
  }
  return supabaseServiceInstance;
}

// Flows arquivados (não usados):
// import { RegisterProgressFlow } from '../flows/_archived/registerProgress.ts';
// import { RegisterReworkFlow } from '../flows/_archived/registerRework.ts';
// import { CheckStatusFlow } from '../flows/_archived/checkStatus.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type TipoUsuario = 'engenheiro' | 'dono' | 'nao_cadastrado';

export interface UserSession {
  whatsapp: string;
  tipo_usuario?: TipoUsuario;
  user_id?: string; // eng_id ou dono_id
  fluxo_ativo?: 'engineer_project' | 'notif_matinal' | 'notif_noturna' | 'owner' | null;
  instancia_fluxo?: any;
  notificacao_contexto?: {
    projectCode: string;
    tipo: 'matinal' | 'noturna';
  };
  ultima_interacao: Date;
}

export interface MessageResponse {
  resposta: string;
  erro?: string;
}

// =====================================================
// CLASSE: Handler de Mensagens
// =====================================================

export class MessageHandler {
  private sessoes: Map<string, UserSession>;
  private readonly MAX_STACK_DEPTH = 10;
  private timeout_sessao: number = 15 * 60 * 1000; // 15 minutos

  constructor() {
    this.sessoes = new Map(); // DEPRECATED

    // Redis cuida da expiração automática via TTL
    console.log('✅ MessageHandler inicializado com SessionService (Redis)');
  }

  // =====================================================
  // FUNÇÃO PRINCIPAL: Processar Mensagem
  // =====================================================

  async processarMensagem(whatsapp: string, mensagem: string): Promise<MessageResponse> {
    try {
      // DEBUG ESPECÍFICO: Número problemático
      const numeroProblema = '5583988990772';
      const isNumeroProblema = whatsapp.includes(numeroProblema) || whatsapp.includes('98899');

      console.log(`\n🔵 MessageHandler.processarMensagem()`);
      console.log(`   WhatsApp: ${whatsapp}`);
      console.log(`   Mensagem: "${mensagem}"`);

      if (isNumeroProblema) {
        console.log(`   🔴🔴🔴 NÚMERO PROBLEMÁTICO CHEGOU NO MESSAGEHANDLER! 🔴🔴🔴`);
      }

      // Normalizar WhatsApp
      console.log(`   🔍 [DEBUG] Normalizando WhatsApp...`);
      const whatsappNormalizado = this.normalizarWhatsapp(whatsapp);
      console.log(`   🔍 [DEBUG] WhatsApp normalizado: ${whatsappNormalizado}`);

      if (isNumeroProblema) {
        console.log(`   🔴 WhatsApp normalizado: ${whatsappNormalizado}`);
      }

      // Obter ou criar sessão
      let sessao = this.sessoes.get(whatsappNormalizado);

      if (!sessao) {
        console.log(`   📝 Criando nova sessão para ${whatsappNormalizado}`);

        // AUTENTICAÇÃO: Verificar se é engenheiro ou dono
        console.log(`   🔍 [DEBUG] Iniciando autenticação...`);
        const tipoUsuario = await this.autenticarUsuario(whatsappNormalizado);
        console.log(`   🔍 [DEBUG] Autenticação concluída: ${tipoUsuario.tipo}`);

        sessao = {
          whatsapp: whatsappNormalizado,
          tipo_usuario: tipoUsuario.tipo,
          user_id: tipoUsuario.user_id,
          fluxo_ativo: null,
          ultima_interacao: new Date(),
        };
        this.sessoes.set(whatsappNormalizado, sessao);

        console.log(`   ✅ Sessão criada - Tipo: ${tipoUsuario.tipo}`);

        // Se for dono, iniciar OwnerFlow imediatamente
        if (tipoUsuario.tipo === 'dono') {
          console.log(`   🔄 Iniciando OwnerFlow automaticamente para novo dono`);
          return await this.iniciarFluxoDono(sessao);
        }

        // Se for engenheiro, mostrar menu
        if (tipoUsuario.tipo === 'engenheiro') {
          return { resposta: this.mensagemMenu(tipoUsuario.tipo) };
        }
      } else {
        console.log(`   ✅ Sessão existente encontrada`);
        console.log(`   Tipo de usuário: ${sessao.tipo_usuario || 'não autenticado'}`);
        console.log(`   Fluxo ativo: ${sessao.fluxo_ativo || 'nenhum'}`);
      }

      // Atualizar timestamp da última interação
      sessao.ultima_interacao = new Date();

      // VERIFICAR SE É NÚMERO NÃO CADASTRADO
      if (sessao.tipo_usuario === 'nao_cadastrado') {
        return {
          resposta: this.mensagemNaoCadastrado(),
        };
      }

      // Verificar comandos globais
      console.log(`   🔍 Verificando comandos globais...`);
      const comandoGlobal = await this.processarComandoGlobal(mensagem, sessao);
      if (comandoGlobal) {
        console.log(`   ✅ Comando global processado\n`);
        return { resposta: comandoGlobal };
      }

      // Verificar se é resposta a notificação automática (apenas para engenheiros)
      if (sessao.tipo_usuario === 'engenheiro' && sessao.notificacao_contexto && !sessao.fluxo_ativo) {
        const { projectCode, tipo } = sessao.notificacao_contexto;

        if (tipo === 'matinal') {
          sessao.fluxo_ativo = 'notif_matinal';
          sessao.instancia_fluxo = new NotificacaoMatinalFlow(whatsappNormalizado, projectCode);
        } else if (tipo === 'noturna') {
          sessao.fluxo_ativo = 'notif_noturna';
          sessao.instancia_fluxo = new NotificacaoNoturnaFlow(whatsappNormalizado, projectCode);
        }

        // Limpar contexto de notificação após iniciar fluxo
        sessao.notificacao_contexto = undefined;

        // Processar primeira mensagem do fluxo
        const resultado = await sessao.instancia_fluxo.processarMensagem(mensagem);

        if (resultado.finalizado) {
          sessao.fluxo_ativo = null;
          sessao.instancia_fluxo = null;
        }

        return { resposta: resultado.mensagem, erro: resultado.erro };
      }

      // Se há fluxo ativo, continuar nele
      if (sessao.fluxo_ativo && sessao.instancia_fluxo) {
        const resultado = await sessao.instancia_fluxo.processarMensagem(mensagem);

        // Se o fluxo finalizou, limpar sessão
        if (resultado.finalizado) {
          sessao.fluxo_ativo = null;
          sessao.instancia_fluxo = null;
        }

        return { resposta: resultado.mensagem, erro: resultado.erro };
      }

      // Classificar intenção e iniciar fluxo apropriado
      const intencao = this.classificarIntencao(mensagem);

      switch (intencao) {
        case 'gerenciar_projeto':
          console.log(`   🔄 Processando fluxo de gerenciamento de projeto`);

          // DECISÃO: Fluxo de engenheiro OU fluxo de dono
          if (sessao.tipo_usuario === 'dono') {
            return await this.iniciarFluxoDono(sessao);
          }

          // Se for comando direto de menu (1, 2, 3, 4), processar diretamente
          const mensagemNorm = mensagem.trim();
          if (mensagemNorm === '1' || mensagemNorm === '2' || mensagemNorm === '3' || mensagemNorm === '4') {
            console.log(`   ✅ Opção do menu detectada: ${mensagemNorm}`);
            // Iniciar fluxo e processar a escolha imediatamente
            const flow = new EngineerProjectFlow(sessao.whatsapp);
            sessao.fluxo_ativo = 'engineer_project';
            sessao.instancia_fluxo = flow;

            // Processar "iniciar" primeiro (vai para stepInicio → escolher_acao)
            await flow.processarMensagem('iniciar');

            // Depois processar a escolha (1, 2, 3 ou 4)
            const resultado = await flow.processarMensagem(mensagemNorm);
            console.log(`   ✅ Fluxo processado, retornando resposta\n`);
            return { resposta: resultado.mensagem };
          } else {
            console.log(`   ✅ Iniciando fluxo de projeto\n`);
            // Palavra-chave genérica (projeto, cadastrar, etc) - mostrar menu
            return await this.iniciarFluxoProjeto(sessao);
          }

        case 'ajuda':
          console.log(`   ✅ Retornando mensagem de ajuda\n`);
          return { resposta: this.mensagemAjuda(sessao.tipo_usuario) };

        case 'menu':
          console.log(`   ✅ Retornando menu principal\n`);
          // Para o dono, iniciar o OwnerFlow diretamente
          if (sessao.tipo_usuario === 'dono') {
            return await this.iniciarFluxoDono(sessao);
          }
          return { resposta: this.mensagemMenu(sessao.tipo_usuario) };

        default:
          // Não tenta mais processar via IA - força uso do menu
          console.log(`   ⚠️ Intenção não reconhecida\n`);
          // Se for dono, iniciar OwnerFlow ao invés de mostrar mensagem de erro
          if (sessao.tipo_usuario === 'dono') {
            console.log(`   🔄 Iniciando OwnerFlow para dono (intenção não reconhecida)`);
            return await this.iniciarFluxoDono(sessao);
          }
          return { resposta: this.mensagemNaoEntendida() };
      }
    } catch (error: any) {
      console.error('\n❌ ERRO no MessageHandler:');
      console.error(`   WhatsApp: ${whatsapp}`);
      console.error(`   Mensagem: "${mensagem}"`);
      console.error(`   Erro: ${error.message}`);
      console.error(`   Stack: ${error.stack}\n`);
      return {
        resposta: '❌ Desculpe, ocorreu um erro. Tente novamente.',
        erro: error.message,
      };
    }
  }

  // =====================================================
  // FUNÇÃO: Autenticar Usuário
  // =====================================================

  private async autenticarUsuario(whatsapp: string): Promise<{ tipo: TipoUsuario; user_id?: string }> {
    console.log(`   🔐 Autenticando usuário: ${whatsapp}`);

    // Verificar se é engenheiro
    console.log(`   🔍 [DEBUG] Buscando engenheiro por telefone...`);
    const engenheiro = await getSupabase().buscarEngenheiroPorTelefone(whatsapp);
    console.log(`   🔍 [DEBUG] Resultado busca engenheiro: ${engenheiro ? 'ENCONTRADO' : 'NÃO encontrado'}`);
    if (engenheiro) {
      console.log(`   ✅ Engenheiro identificado: ${engenheiro.nome} (${engenheiro.eng_id})`);
      return { tipo: 'engenheiro', user_id: engenheiro.eng_id };
    }

    // Verificar se é dono
    console.log(`   🔍 [DEBUG] Buscando dono por telefone...`);
    const dono = await getSupabase().buscarDonoPorTelefone(whatsapp);
    console.log(`   🔍 [DEBUG] Resultado busca dono: ${dono ? 'ENCONTRADO' : 'NÃO encontrado'}`);
    if (dono) {
      console.log(`   ✅ Dono identificado: ${dono.nome} (${dono.dono_id})`);
      return { tipo: 'dono', user_id: dono.dono_id };
    }

    // Não cadastrado
    console.log(`   ⚠️ Número não cadastrado no sistema`);
    return { tipo: 'nao_cadastrado' };
  }

  // =====================================================
  // FUNÇÃO: Processar Comandos Globais
  // =====================================================

  private async processarComandoGlobal(mensagem: string, sessao: UserSession): Promise<string | null> {
    const mensagemLower = mensagem.toLowerCase().trim();

    // Comando: Sincronizar manualmente
    if (mensagemLower === 'sync' || mensagemLower === 'sincronizar') {
      return await this.executarSincronizacaoManual();
    }

    // Comando: Cancelar fluxo atual
    if (mensagemLower === 'cancelar' || mensagemLower === 'sair') {
      if (sessao.fluxo_ativo) {
        sessao.fluxo_ativo = null;
        sessao.instancia_fluxo = null;
        return '❌ Fluxo cancelado.\n\nDigite "menu" para ver as opções.';
      }
      return null;
    }

    // Comando: Menu
    if (mensagemLower === 'menu' || mensagemLower === 'oi' || mensagemLower === 'olá') {
      sessao.fluxo_ativo = null;
      sessao.instancia_fluxo = null;
      return null; // Deixar passar para o classificador processar
    }

    return null;
  }

  // =====================================================
  // FUNÇÃO: Classificar Intenção do Usuário
  // =====================================================

  private classificarIntencao(mensagem: string): string {
    const mensagemLower = mensagem.toLowerCase().trim();

    // Atalhos numéricos do menu
    if (mensagemLower === '1' || mensagemLower === '2' || mensagemLower === '3' || mensagemLower === '4') {
      return 'gerenciar_projeto'; // Opções 1, 2, 3, 4 = Gestão de projetos
    }

    // Palavras-chave para MODIFICAR projetos (Engenheiros)
    const keywordsModificar = [
      'projeto',
      'cadastrar',
      'novo',
      'atualizar',
      'criar',
      'modificar',
      'editar',
      'adicionar',
      'registrar',
    ];

    // Palavras-chave para ajuda
    const keywordsAjuda = [
      'ajuda',
      'help',
      'como usar',
      'comandos',
    ];

    // Palavras-chave para menu
    const keywordsMenu = [
      'menu',
      'oi',
      'olá',
      'ola',
      'início',
      'inicio',
    ];

    // Classificar (prioridade: específico → genérico)
    if (keywordsMenu.some(kw => mensagemLower === kw)) {
      return 'menu';
    }

    if (keywordsAjuda.some(kw => mensagemLower.includes(kw))) {
      return 'ajuda';
    }

    if (keywordsModificar.some(kw => mensagemLower.includes(kw))) {
      return 'gerenciar_projeto';
    }

    // Default: menu (força uso de comandos estruturados)
    return 'menu';
  }

  // =====================================================
  // FUNÇÕES: Iniciar Fluxos
  // =====================================================

  private async iniciarFluxoProjeto(sessao: UserSession): Promise<MessageResponse> {
    const flow = new EngineerProjectFlow(sessao.whatsapp);
    sessao.fluxo_ativo = 'engineer_project';
    sessao.instancia_fluxo = flow;

    // Iniciar fluxo (mostra menu de 3 opções)
    const resultado = await flow.processarMensagem('iniciar');
    return { resposta: resultado.mensagem };
  }

  private async iniciarFluxoDono(sessao: UserSession): Promise<MessageResponse> {
    if (!sessao.user_id) {
      return {
        resposta: '❌ Erro de autenticação. Digite "menu" para recomeçar.',
      };
    }

    // Se já existe um fluxo ativo do dono, NÃO criar um novo!
    if (sessao.fluxo_ativo === 'owner' && sessao.instancia_fluxo) {
      console.log('   ⚠️ [DEBUG] Fluxo do dono já ativo, não criando novo');
      const resultado = await sessao.instancia_fluxo.processarMensagem('iniciar');
      return { resposta: resultado.mensagem };
    }

    console.log('   ✅ [DEBUG] Criando nova instância do OwnerFlow');
    const flow = new OwnerFlow(sessao.whatsapp, sessao.user_id);
    sessao.fluxo_ativo = 'owner';
    sessao.instancia_fluxo = flow;

    // Iniciar fluxo (mostra menu do dono)
    const resultado = await flow.processarMensagem('iniciar');
    return { resposta: resultado.mensagem };
  }

  // =====================================================
  // MENSAGENS PADRÃO
  // =====================================================

  private mensagemMenu(tipoUsuario?: TipoUsuario): string {
    if (tipoUsuario === 'dono') {
      return `👔 *Menu do Dono*

📊 *Gestão da Empresa*
1️⃣ Distribuir tarefa para engenheiro
2️⃣ Verificar status dos projetos
3️⃣ Consultar histórico e relatórios

❓ *Ajuda*
Digite "ajuda" para instruções

_Digite o número da opção desejada_`;
    }

    // Menu de engenheiro (padrão)
    return `🤖 *Menu do Engenheiro*

📋 *Atualizações Diárias*
1️⃣ Notificação Matinal
2️⃣ Notificação Noturna

✏️ *Gestão*
3️⃣ Editar projeto
4️⃣ Visualizar Meus Projetos

❓ *Ajuda*
Digite "ajuda" para instruções

_Digite o número da opção desejada_`;
  }

  private mensagemAjuda(tipoUsuario?: TipoUsuario): string {
    if (tipoUsuario === 'dono') {
      return `ℹ️ *Ajuda - Dono da Empresa*

*📊 DISTRIBUIR TAREFAS*
Fluxo guiado para atribuir projetos aos engenheiros:
• Escolher engenheiro
• Definir área e tipo de projeto
• Configurar prazos e complexidade
• Adicionar observações

Digite: *1* no menu principal

*📈 VERIFICAR PROJETOS*
Acompanhe o status de todos os projetos:
• Ver projetos em andamento
• Consultar deadlines
• Analisar performance da equipe

Digite: *2* no menu principal

*📋 RELATÓRIOS*
Acesse históricos e indicadores:
• Projetos concluídos
• Tempo médio por área
• Taxa de retrabalho

Digite: *3* no menu principal

*🔄 COMANDOS ÚTEIS*
• *sync* - Força sincronização Supabase → Sheets
• *cancelar* - Sai do fluxo atual
• *menu* - Volta ao menu principal

_Digite "menu" para voltar_`;
    }

    // Ajuda de engenheiro (padrão)
    return `ℹ️ *Ajuda - Engenheiro*

*📊 GERENCIAR PROJETOS*
Fluxo guiado com menus numerados para:
• Cadastrar novo projeto (todas as informações)
• Editar projeto existente
• Atualizar diariamente em 2 períodos:

🌅 *Manhã:* Status + Previsão do dia
🌙 *Noite:* Feito + Retrabalho + Observações

Digite: *projeto* ou *menu* para iniciar

*🔔 NOTIFICAÇÕES AUTOMÁTICAS*
Você receberá lembretes automáticos:
• Manhã (09:00): Para informar status e previsão
• Noite (17:00): Para registrar o que foi feito

*🔄 COMANDOS ÚTEIS*
• *sync* - Força sincronização Supabase → Sheets
• *cancelar* - Sai do fluxo atual
• *menu* - Volta ao menu principal

*💡 Dicas*
• Use áudio para facilitar 🎤
• Responda apenas com os números dos menus

_Digite "menu" para voltar_`;
  }

  private mensagemNaoCadastrado(): string {
    return `🚫 *Número não cadastrado*

Seu número de WhatsApp não está cadastrado no sistema.

Para obter acesso, entre em contato com o administrador da TecPred.

📞 *Informações necessárias:*
• Seu nome completo
• Cargo/função (Engenheiro ou Dono)
• Número de WhatsApp (este número)

_Após o cadastro, você receberá acesso automático ao sistema._`;
  }

  private mensagemNaoEntendida(): string {
    return `🤔 Desculpe, não entendi sua mensagem.

Digite *menu* para ver as opções disponíveis`;
  }

  // =====================================================
  // FUNÇÃO: Sincronização Manual
  // =====================================================

  private async executarSincronizacaoManual(): Promise<string> {
    try {
      const { executarSincronizacao } = await import('../../integrations/cron/syncDatabaseToSheets.ts');

      // Executar sincronização em background
      executarSincronizacao().catch(error => {
        console.error('❌ Erro na sincronização manual:', error);
      });

      return `🔄 *Sincronização iniciada!*\n\n` +
        `Os dados do Supabase estão sendo sincronizados\n` +
        `para o Google Sheets agora.\n\n` +
        `⏱️ Aguarde alguns segundos e verifique a planilha.\n\n` +
        `_A sincronização automática continua a cada 5 minutos_`;
    } catch (error: any) {
      console.error('Erro ao executar sincronização manual:', error);
      return `❌ Erro ao iniciar sincronização.\n\n` +
        `Verifique se o Supabase está configurado corretamente.`;
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  private normalizarWhatsapp(whatsapp: string): string {
    try {
      // Se já tem @c.us ou @g.us, remover primeiro
      let numero = whatsapp;
      if (whatsapp.includes('@')) {
        numero = whatsapp.split('@')[0];
      }

      // Remove caracteres especiais e garante formato +55XXXXXXXXXXX
      const cleaned = numero.replace(/[^\d+]/g, '');

      // DEBUG: Número problemático
      if (cleaned.includes('98899') || cleaned.includes('5583988990772')) {
        console.log(`   🔍 Normalizando número problemático:`);
        console.log(`   Original: ${whatsapp}`);
        console.log(`   Após remover @: ${numero}`);
        console.log(`   Após limpar: ${cleaned}`);
      }

      if (!cleaned.startsWith('+')) {
        const resultado = '+55' + cleaned;
        if (cleaned.includes('98899') || cleaned.includes('5583988990772')) {
          console.log(`   Resultado final: ${resultado}`);
        }
        return resultado;
      }

      if (cleaned.includes('98899') || cleaned.includes('5583988990772')) {
        console.log(`   Resultado final: ${cleaned}`);
      }

      return cleaned;
    } catch (error: any) {
      console.error(`❌ Erro ao normalizar WhatsApp "${whatsapp}":`, error);
      // Retornar o original se houver erro
      return whatsapp.replace(/[^\d+]/g, '').replace(/^(\d+)$/, '+55$1');
    }
  }

  private limparSessoesAntigas(): void {
    const agora = new Date();
    const sessoesARemover: string[] = [];

    this.sessoes.forEach((sessao, whatsapp) => {
      const tempoDecorrido = agora.getTime() - sessao.ultima_interacao.getTime();
      if (tempoDecorrido > this.timeout_sessao) {
        sessoesARemover.push(whatsapp);
      }
    });

    sessoesARemover.forEach(whatsapp => {
      this.sessoes.delete(whatsapp);
      console.log(`Sessão expirada removida: ${whatsapp}`);
    });

    if (sessoesARemover.length > 0) {
      console.log(`${sessoesARemover.length} sessões antigas removidas`);
    }
  }

  // =====================================================
  // NOTIFICAÇÕES - Gerenciamento de Contexto
  // =====================================================

  /**
   * Define contexto de notificação para um usuário
   * Usado pelo NotificationService quando envia notificação
   */
  setNotificationContext(
    whatsapp: string,
    context: { projectCode: string; tipo: 'matinal' | 'noturna' }
  ): void {
    const whatsappNormalizado = this.normalizarWhatsapp(whatsapp);

    // Obter ou criar sessão
    let sessao = this.sessoes.get(whatsappNormalizado);

    if (!sessao) {
      sessao = {
        whatsapp: whatsappNormalizado,
        fluxo_ativo: null,
        ultima_interacao: new Date(),
      };
      this.sessoes.set(whatsappNormalizado, sessao);
    }

    // Definir contexto de notificação
    sessao.notificacao_contexto = context;
    sessao.ultima_interacao = new Date();

    console.log(`📌 Contexto de notificação definido: ${whatsapp} → ${context.tipo} (${context.projectCode})`);
  }

  // =====================================================
  // GETTERS
  // =====================================================

  getSessaoAtiva(whatsapp: string): UserSession | undefined {
    return this.sessoes.get(this.normalizarWhatsapp(whatsapp));
  }

  getTotalSessoes(): number {
    return this.sessoes.size;
  }
}

// =====================================================
// EXPORTAR INSTÂNCIA SINGLETON
// =====================================================

export const messageHandler = new MessageHandler();

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import { messageHandler } from './messageHandler';

// Processar mensagens
const resposta1 = await messageHandler.processarMensagem('+5511999999999', 'oi');
console.log(resposta1.resposta);

const resposta2 = await messageHandler.processarMensagem('+5511999999999', 'registrar execução');
console.log(resposta2.resposta);

const resposta3 = await messageHandler.processarMensagem('+5511999999999', 'PRJ-001');
console.log(resposta3.resposta);

// ... continuar o fluxo
*/

