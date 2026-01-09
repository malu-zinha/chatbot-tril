// =====================================================
// HANDLER PRINCIPAL: Mensagens do Chatbot
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo orquestra todos os fluxos conversacionais
// e decide qual fluxo ativar baseado na mensagem do usuário
// =====================================================

// Flows ativos
import { EngineerProjectFlow } from '../flows/engineerProjectFlow.ts';
import { NotificacaoMatinalFlow, NotificacaoNoturnaFlow } from '../flows/notificationFlows.ts';

// Flows arquivados (não usados):
// import { RegisterProgressFlow } from '../flows/_archived/registerProgress.ts';
// import { RegisterReworkFlow } from '../flows/_archived/registerRework.ts';
// import { CheckStatusFlow } from '../flows/_archived/checkStatus.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface UserSession {
  whatsapp: string;
  fluxo_ativo?: 'engineer_project' | 'notif_matinal' | 'notif_noturna' | null;
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
  private timeout_sessao: number = 15 * 60 * 1000; // 15 minutos

  constructor() {
    this.sessoes = new Map();
    
    // Limpar sessões antigas periodicamente
    setInterval(() => this.limparSessoesAntigas(), 5 * 60 * 1000); // A cada 5 minutos
  }

  // =====================================================
  // FUNÇÃO PRINCIPAL: Processar Mensagem
  // =====================================================

  async processarMensagem(whatsapp: string, mensagem: string): Promise<MessageResponse> {
    try {
      // Normalizar WhatsApp
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

      // Atualizar timestamp da última interação
      sessao.ultima_interacao = new Date();

      // Verificar comandos globais
      const comandoGlobal = await this.processarComandoGlobal(mensagem, sessao);
      if (comandoGlobal) {
        return { resposta: comandoGlobal };
      }

      // Verificar se é resposta a notificação automática
      if (sessao.notificacao_contexto && !sessao.fluxo_ativo) {
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
          // Se for comando direto de menu (1, 2, 3), processar diretamente
          const mensagemNorm = mensagem.trim();
          if (mensagemNorm === '1' || mensagemNorm === '2' || mensagemNorm === '3') {
            // Iniciar fluxo e processar a escolha imediatamente
            const flow = new EngineerProjectFlow(sessao.whatsapp);
            sessao.fluxo_ativo = 'engineer_project';
            sessao.instancia_fluxo = flow;
            
            // Processar "iniciar" primeiro (vai para stepInicio → escolher_acao)
            await flow.processarMensagem('iniciar');
            
            // Depois processar a escolha (1, 2 ou 3)
            const resultado = await flow.processarMensagem(mensagemNorm);
            return { resposta: resultado.mensagem };
          } else {
            // Palavra-chave genérica (projeto, cadastrar, etc) - mostrar menu
            return await this.iniciarFluxoProjeto(sessao);
          }
        
        case 'ajuda':
          return { resposta: this.mensagemAjuda() };
        
        case 'menu':
          return { resposta: this.mensagemMenu() };
        
        default:
          // Não tenta mais processar via IA - força uso do menu
          return { resposta: this.mensagemNaoEntendida() };
      }
    } catch (error: any) {
      console.error('Erro ao processar mensagem:', error);
      return {
        resposta: '❌ Desculpe, ocorreu um erro. Tente novamente.',
        erro: error.message,
      };
    }
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
    if (mensagemLower === '1' || mensagemLower === '2' || mensagemLower === '3') {
      return 'gerenciar_projeto'; // Opções 1, 2, 3 = Gestão de projetos
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

  // =====================================================
  // MENSAGENS PADRÃO
  // =====================================================

  private mensagemMenu(): string {
    return `🤖 *Menu Principal*

📋 *Gestão de Projetos*
1️⃣ Criar novo projeto
2️⃣ Editar projeto existente
3️⃣ Notificações diárias (Manhã/Noite)

❓ *Ajuda*
Digite "ajuda" para instruções

_Digite o número da opção desejada_`;
  }

  private mensagemAjuda(): string {
    return `ℹ️ *Ajuda - Como Usar o Sistema*

*📊 MODIFICAR PROJETOS (Engenheiros)*
Fluxo guiado com menus numerados para:
• Cadastrar novo projeto (todas as informações)
• Atualizar diariamente em 2 períodos:

🌅 *Manhã:* Status + Previsão do dia
🌙 *Noite:* Feito + Retrabalho + Etapa + Observações

Digite: *projeto* para iniciar

*🔔 NOTIFICAÇÕES AUTOMÁTICAS*
Você receberá lembretes automáticos:
• Manhã: Para informar status e previsão
• Noite: Para registrar o que foi feito

*🔄 COMANDOS ÚTEIS*
• *sync* - Força sincronização Supabase → Sheets
• *cancelar* - Sai do fluxo atual
• *menu* - Volta ao menu principal

*💡 Dicas*
• Use áudio para facilitar 🎤
• Responda apenas com os números dos menus

_Digite "menu" para voltar_`;
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
    // Remove caracteres especiais e garante formato +55XXXXXXXXXXX
    const cleaned = whatsapp.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      return '+55' + cleaned;
    }
    return cleaned;
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

