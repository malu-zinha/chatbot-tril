// =====================================================
// SERVICE: Notification Service
// =====================================================
// Gerencia envio de notificações automáticas matinais e noturnas
// UMA mensagem consolidada por engenheiro
// =====================================================

import { getSupabaseService } from '../supabase/supabaseService.ts';
import { getWhatsAppService } from '../whatsapp/whatsappService.ts';
import type { WhatsAppService } from '../whatsapp/whatsappService.ts';

// =====================================================
// TIPOS
// =====================================================

interface EngenheiroComProjetos {
  eng_id: string;
  nome: string;
  telefone: string;
  projetos: ProjetoAtribuido[];
}

interface ProjetoAtribuido {
  codigo_projeto: string;
  cliente: string;
  area_descricao: string;
  status_descricao: string;
  percentual_andamento: number;
  data_prevista: string | null;
}

// =====================================================
// CLASSE: NotificationService
// =====================================================

export class NotificationService {
  private supabaseService;
  private whatsappService: WhatsAppService;

  constructor(whatsappService?: WhatsAppService) {
    this.supabaseService = getSupabaseService();
    this.whatsappService = whatsappService || getWhatsAppService();
  }

  /**
   * Define o WhatsApp Service (para injeção de dependência)
   */
  setWhatsAppService(service: WhatsAppService): void {
    this.whatsappService = service;
  }

  /**
   * Envia notificações matinais para todos os engenheiros com projetos ativos
   * UMA MENSAGEM CONSOLIDADA POR ENGENHEIRO
   */
  async sendMorningNotifications(): Promise<void> {
    console.log('🌅 Iniciando notificações matinais...\n');

    try {
      const engenheirosComProjetos = await this.buscarEngenheirosComProjetosAtivos();

      if (engenheirosComProjetos.length === 0) {
        console.log('⚠️  Nenhum engenheiro com projetos ativos para notificar\n');
        return;
      }

      console.log(`📊 Engenheiros com projetos ativos: ${engenheirosComProjetos.length}\n`);

      let totalEnviadas = 0;
      let totalErros = 0;

      for (const eng of engenheirosComProjetos) {
        try {
          const mensagem = this.formatarNotificacaoMatinal(eng);
          const sucesso = await this.whatsappService.sendMessage(eng.telefone, mensagem);

          if (sucesso) {
            console.log(`✅ Notificação matinal enviada: ${eng.nome} (${eng.projetos.length} projetos)`);
            totalEnviadas++;
          } else {
            console.log(`❌ Falha ao enviar para: ${eng.nome}`);
            totalErros++;
          }

          // Delay entre mensagens
          await this.sleep(1000);

        } catch (error: any) {
          console.error(`❌ Erro ao enviar para ${eng.nome}:`, error.message);
          totalErros++;
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 Resumo das Notificações Matinais:');
      console.log(`   ✅ Enviadas: ${totalEnviadas}`);
      console.log(`   ❌ Erros: ${totalErros}`);
      console.log(`   📱 Total: ${engenheirosComProjetos.length}`);
      console.log('='.repeat(60) + '\n');

    } catch (error: any) {
      console.error('❌ Erro geral ao buscar engenheiros:', error.message);
      throw error;
    }
  }

  /**
   * Envia notificações noturnas para todos os engenheiros com projetos ativos
   * UMA MENSAGEM CONSOLIDADA POR ENGENHEIRO
   */
  async sendNightNotifications(): Promise<void> {
    console.log('🌙 Iniciando notificações noturnas...\n');

    try {
      const engenheirosComProjetos = await this.buscarEngenheirosComProjetosAtivos();

      if (engenheirosComProjetos.length === 0) {
        console.log('⚠️  Nenhum engenheiro com projetos ativos para notificar\n');
        return;
      }

      console.log(`📊 Engenheiros com projetos ativos: ${engenheirosComProjetos.length}\n`);

      let totalEnviadas = 0;
      let totalErros = 0;

      for (const eng of engenheirosComProjetos) {
        try {
          const mensagem = this.formatarNotificacaoNoturna(eng);
          const sucesso = await this.whatsappService.sendMessage(eng.telefone, mensagem);

          if (sucesso) {
            console.log(`✅ Notificação noturna enviada: ${eng.nome} (${eng.projetos.length} projetos)`);
            totalEnviadas++;
          } else {
            console.log(`❌ Falha ao enviar para: ${eng.nome}`);
            totalErros++;
          }

          // Delay entre mensagens
          await this.sleep(1000);

        } catch (error: any) {
          console.error(`❌ Erro ao enviar para ${eng.nome}:`, error.message);
          totalErros++;
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 Resumo das Notificações Noturnas:');
      console.log(`   ✅ Enviadas: ${totalEnviadas}`);
      console.log(`   ❌ Erros: ${totalErros}`);
      console.log(`   📱 Total: ${engenheirosComProjetos.length}`);
      console.log('='.repeat(60) + '\n');

    } catch (error: any) {
      console.error('❌ Erro geral ao buscar engenheiros:', error.message);
      throw error;
    }
  }

  /**
   * Busca engenheiros com projetos ativos no Supabase
   * Agrupa projetos por engenheiro
   */
  private async buscarEngenheirosComProjetosAtivos(): Promise<EngenheiroComProjetos[]> {
    const supabase = this.supabaseService.getClient();

    // Buscar todas as atribuições ativas
    const { data, error } = await supabase
      .from('engenheiros_projetos')
      .select(`
        eng_id,
        engenheiros!inner(eng_id, nome, telefone),
        projetos!inner(codigo_projeto, cliente, ativo),
        areas!inner(descricao),
        status_codes(descricao),
        percentual_andamento,
        data_prevista
      `)
      .eq('ativo', true)
      .eq('projetos.ativo', true);

    if (error) {
      console.error('❌ Erro ao buscar atribuições:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Agrupar por engenheiro
    const engenheirosMap = new Map<string, EngenheiroComProjetos>();

    for (const atrib of data) {
      const engenheiro: any = atrib.engenheiros;
      const projeto: any = atrib.projetos;
      const area: any = atrib.areas;
      const status: any = atrib.status_codes;

      const eng_id = engenheiro.eng_id;

      if (!engenheirosMap.has(eng_id)) {
        engenheirosMap.set(eng_id, {
          eng_id: engenheiro.eng_id,
          nome: engenheiro.nome,
          telefone: engenheiro.telefone,
          projetos: []
        });
      }

      engenheirosMap.get(eng_id)!.projetos.push({
        codigo_projeto: projeto.codigo_projeto,
        cliente: projeto.cliente,
        area_descricao: area.descricao,
        status_descricao: status?.descricao || 'N/A',
        percentual_andamento: atrib.percentual_andamento || 0,
        data_prevista: atrib.data_prevista
      });
    }

    return Array.from(engenheirosMap.values());
  }

  /**
   * Formata mensagem de notificação matinal consolidada
   */
  private formatarNotificacaoMatinal(engenheiro: EngenheiroComProjetos): string {
    const primeiroNome = engenheiro.nome.split(' ')[0];
    const totalProjetos = engenheiro.projetos.length;

    let mensagem = `🌅 *Bom dia, ${primeiroNome}!*\n\n`;

    if (totalProjetos === 1) {
      mensagem += `Você tem *1 projeto ativo* para atualizar hoje:\n\n`;
    } else {
      mensagem += `Você tem *${totalProjetos} projetos ativos* para atualizar hoje:\n\n`;
    }

    engenheiro.projetos.forEach((proj, idx) => {
      mensagem += `📊 *${proj.codigo_projeto}* - ${proj.cliente}\n`;
      mensagem += `   📦 Área: ${proj.area_descricao}\n`;
      mensagem += `   📈 Status: ${proj.status_descricao}\n`;
      if (proj.data_prevista) {
        const data = new Date(proj.data_prevista).toLocaleDateString('pt-BR');
        mensagem += `   📅 Prazo: ${data}\n`;
      }
      mensagem += `\n`;
    });

    mensagem += `Por favor, atualize:\n`;
    mensagem += `• Status do projeto\n`;
    mensagem += `• Previsão para o dia\n\n`;
    mensagem += `_Digite "menu" para iniciar_`;

    return mensagem;
  }

  /**
   * Formata mensagem de notificação noturna consolidada
   */
  private formatarNotificacaoNoturna(engenheiro: EngenheiroComProjetos): string {
    const primeiroNome = engenheiro.nome.split(' ')[0];
    const totalProjetos = engenheiro.projetos.length;

    let mensagem = `🌙 *Boa noite, ${primeiroNome}!*\n\n`;

    if (totalProjetos === 1) {
      mensagem += `Hora de registrar o trabalho de hoje em *1 projeto*:\n\n`;
    } else {
      mensagem += `Hora de registrar o trabalho de hoje em *${totalProjetos} projetos*:\n\n`;
    }

    engenheiro.projetos.forEach((proj) => {
      mensagem += `📊 *${proj.codigo_projeto}* - ${proj.cliente}\n`;
      mensagem += `   📦 Área: ${proj.area_descricao}\n`;
      mensagem += `   ⚡ Andamento: ${proj.percentual_andamento}%\n`;
      mensagem += `\n`;
    });

    mensagem += `Por favor, registre:\n`;
    mensagem += `• O que foi feito hoje\n`;
    mensagem += `• Houve retrabalho?\n`;
    mensagem += `• Observações (obrigatório)\n\n`;
    mensagem += `_Digite "menu" para iniciar_`;

    return mensagem;
  }

  /**
   * Utilitário: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================================
// SINGLETON
// =====================================================

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

export function setNotificationService(service: NotificationService): void {
  notificationServiceInstance = service;
}
