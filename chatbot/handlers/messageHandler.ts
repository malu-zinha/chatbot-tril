// =====================================================
// HANDLER PRINCIPAL: Mensagens do Chatbot
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo orquestra todos os fluxos conversacionais
// e decide qual fluxo ativar baseado na mensagem do usuário
// =====================================================

import { RegisterProgressFlow } from '../flows/registerProgress.js';
import { RegisterReworkFlow } from '../flows/registerRework.js';
import { CheckStatusFlow } from '../flows/checkStatus.js';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface UserSession {
  whatsapp: string;
  fluxo_ativo?: 'progress' | 'rework' | 'status' | null;
  instancia_fluxo?: any;
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
        case 'registrar_execucao':
          return await this.iniciarFluxoExecucao(sessao);
        
        case 'registrar_retrabalho':
          return await this.iniciarFluxoRetrabalho(sessao);
        
        case 'consultar_status':
          return await this.iniciarFluxoStatus(sessao);
        
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

    // Palavras-chave para registrar execução
    const keywordsExecucao = [
      'registrar',
      'executar',
      'execução',
      'progresso',
      'avanço',
      'percentual',
      'realizado',
      'hoje',
      'diário',
    ];

    // Palavras-chave para registrar retrabalho
    const keywordsRetrabalho = [
      'retrabalho',
      'refazer',
      'erro',
      'problema',
      'houve retrabalho',
      'teve retrabalho',
    ];

    // Palavras-chave para consultar status
    const keywordsStatus = [
      'status',
      'consultar',
      'ver',
      'andamento',
      'como está',
      'quanto',
      'percentual total',
      'progresso total',
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

    // Classificar
    if (keywordsMenu.some(kw => mensagemLower.includes(kw))) {
      return 'menu';
    }

    if (keywordsAjuda.some(kw => mensagemLower.includes(kw))) {
      return 'ajuda';
    }

    if (keywordsRetrabalho.some(kw => mensagemLower.includes(kw))) {
      return 'registrar_retrabalho';
    }

    if (keywordsStatus.some(kw => mensagemLower.includes(kw))) {
      return 'consultar_status';
    }

    if (keywordsExecucao.some(kw => mensagemLower.includes(kw))) {
      return 'registrar_execucao';
    }

    // Se não classificou, assumir menu
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

  // =====================================================
  // MENSAGENS PADRÃO
  // =====================================================

  private mensagemMenu(): string {
    return `👋 *Olá! Bem-vindo ao Sistema de Gestão de Projetos*

Escolha uma opção:

1️⃣ *Registrar Execução Diária*
   Digite: _registrar execução_

2️⃣ *Registrar Retrabalho*
   Digite: _registrar retrabalho_

3️⃣ *Consultar Status do Projeto*
   Digite: _consultar status_

4️⃣ *Ajuda*
   Digite: _ajuda_

_Digite a opção desejada ou envie uma mensagem descrevendo o que precisa._`;
  }

  private mensagemAjuda(): string {
    return `ℹ️ *Ajuda - Como Usar o Sistema*

*📊 Registrar Execução Diária*
Use para registrar o progresso diário do seu projeto.
Você informará: código do projeto, percentual previsto, percentual realizado e observações.

*🔧 Registrar Retrabalho*
Use quando houver retrabalho no projeto.
Você informará: código do projeto, motivo, descrição e impacto.

*📈 Consultar Status*
Use para ver o progresso total do projeto.
Mostra: percentual concluído, estatísticas, execuções recentes e retrabalhos.

*💡 Dicas*
• Digite "cancelar" a qualquer momento para sair
• Digite "menu" para voltar ao menu principal
• Seja específico nas descrições e observações

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

