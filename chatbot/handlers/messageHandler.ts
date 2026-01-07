// =====================================================
// HANDLER PRINCIPAL: Mensagens do Chatbot
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo orquestra todos os fluxos conversacionais
// e decide qual fluxo ativar baseado na mensagem do usuário
// =====================================================

import { RegisterProgressFlow } from '../flows/registerProgress.ts';
import { RegisterReworkFlow } from '../flows/registerRework.ts';
import { CheckStatusFlow } from '../flows/checkStatus.ts';
import { EngineerProjectFlow } from '../flows/engineerProjectFlow.ts';
import { NotificacaoMatinalFlow, NotificacaoNoturnaFlow } from '../flows/notificationFlows.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface UserSession {
  whatsapp: string;
  fluxo_ativo?: 'progress' | 'rework' | 'status' | 'engineer_project' | 'notif_matinal' | 'notif_noturna' | null;
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
          return await this.iniciarFluxoProjeto(sessao);
        
        case 'consultar':
          // Retorna "não entendida" para que o sheetsBot processe via IA
          return { resposta: this.mensagemNaoEntendida() };
        
        case 'ajuda':
          return { resposta: this.mensagemAjuda() };
        
        case 'menu':
          return { resposta: this.mensagemMenu() };
        
        default:
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
    if (mensagemLower === '1') {
      return 'gerenciar_projeto'; // Opção 1 = Modificar projetos
    }
    if (mensagemLower === '2') {
      return 'consultar'; // Opção 2 = Consultar
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
      'registrar projeto',
    ];

    // Palavras-chave para CONSULTAR (CEO/Gestores)
    const keywordsConsultar = [
      'consultar',
      'ver',
      'mostrar',
      'listar',
      'quantos',
      'qual',
      'quais',
      'status',
      'informação',
      'dados',
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

    if (keywordsConsultar.some(kw => mensagemLower.includes(kw))) {
      return 'consultar';
    }

    // Se parece uma pergunta (tem ?, tem palavras interrogativas), é consulta
    if (mensagemLower.includes('?') || 
        /^(qual|quais|quantos|quanto|onde|como|quando|quem)/i.test(mensagemLower)) {
      return 'consultar';
    }

    // Default: menu (para não deixar o usuário perdido)
    return 'menu';
  }

  // =====================================================
  // FUNÇÕES: Iniciar Fluxos
  // =====================================================

  private async iniciarFluxoExecucao(sessao: UserSession): Promise<MessageResponse> {
    const flow = new RegisterProgressFlow(sessao.whatsapp);
    sessao.fluxo_ativo = 'progress';
    sessao.instancia_fluxo = flow;

    const resultado = await flow.processarMensagem('iniciar');
    return { resposta: resultado.mensagem };
  }

  private async iniciarFluxoRetrabalho(sessao: UserSession): Promise<MessageResponse> {
    const flow = new RegisterReworkFlow(sessao.whatsapp);
    sessao.fluxo_ativo = 'rework';
    sessao.instancia_fluxo = flow;

    const resultado = await flow.processarMensagem('iniciar');
    return { resposta: resultado.mensagem };
  }

  private async iniciarFluxoStatus(sessao: UserSession): Promise<MessageResponse> {
    const flow = new CheckStatusFlow(sessao.whatsapp);
    sessao.fluxo_ativo = 'status';
    sessao.instancia_fluxo = flow;

    const resultado = await flow.processarMensagem('iniciar');
    return { resposta: resultado.mensagem };
  }

  private async iniciarFluxoProjeto(sessao: UserSession): Promise<MessageResponse> {
    const flow = new EngineerProjectFlow(sessao.whatsapp);
    sessao.fluxo_ativo = 'engineer_project';
    sessao.instancia_fluxo = flow;

    const resultado = await flow.processarMensagem('iniciar');
    return { resposta: resultado.mensagem };
  }

  // =====================================================
  // MENSAGENS PADRÃO
  // =====================================================

  private mensagemMenu(): string {
    return `👋 *Olá! Bem-vindo ao Sistema de Gestão de Projetos*

Escolha o que você precisa:

📊 *1️⃣ MODIFICAR PROJETOS* (Engenheiros)
   Cadastrar novos ou atualizar diariamente
   Digite: *1* ou _projeto_ ou _modificar_
   
   *Atualizações diárias:*
   🌅 Manhã: Status + Previsão do dia
   🌙 Noite: Feito + Retrabalho + Etapa + Obs

💬 *2️⃣ CONSULTAR INFORMAÇÕES* (CEO/Gestores)
   Fazer perguntas sobre a planilha (texto ou áudio)
   Digite: *2* ou _consultar_ ou faça sua pergunta diretamente
   
   Exemplos:
   • "Quantos projetos em execução?"
   • "Status do PRJ-001?"
   • "Projetos atrasados?"

_Digite o número da opção ou a palavra-chave._`;
  }

  private mensagemAjuda(): string {
    return `ℹ️ *Ajuda - Como Usar o Sistema*

*📊 MODIFICAR PROJETOS (Engenheiros)*
Fluxo guiado com botões para:
• Cadastrar novo projeto (todas as informações)
• Atualizar diariamente em 2 períodos:

🌅 *Manhã:* Status + Previsão do dia
🌙 *Noite:* Feito + Retrabalho + Etapa + Observações

Digite: _projeto_, _modificar_, _cadastrar_ ou _atualizar_

*💬 CONSULTAR INFORMAÇÕES (CEO/Gestores)*
Faça perguntas em linguagem natural (texto ou áudio):
• "Quantos projetos temos?"
• "Status do PRJ-001?"
• "Projetos em atraso?"
• "Retrabalhos da semana?"

*💡 Dicas*
• Digite "cancelar" para sair de um fluxo
• Digite "menu" para ver opções
• Use áudio para consultas rápidas 🎤

_Digite "menu" para voltar_`;
  }

  private mensagemNaoEntendida(): string {
    return `🤔 Desculpe, não entendi sua mensagem.

Digite *menu* para ver as opções disponíveis
ou
Digite *ajuda* para ver como usar o sistema`;
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

