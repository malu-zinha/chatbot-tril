// =====================================================
// Notification Worker
// =====================================================
// Processa notificações pendentes na tabela notificacoes_whatsapp
// Executa a cada 1 minuto via cron job
// =====================================================

import { getSupabaseService } from '../supabase/supabaseService.ts';
import { getWhatsAppService } from '../whatsapp/whatsappService.ts';
import type { WhatsAppService } from '../whatsapp/whatsappService.ts';

// =====================================================
// TIPOS
// =====================================================

interface NotificacaoPendente {
  notificacao_id: string;
  eng_id: string;
  telefone: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  tentativas: number;
  created_at: string;
}

// =====================================================
// CLASSE: NotificationWorker
// =====================================================

export class NotificationWorker {
  private supabaseService;
  private whatsappService: WhatsAppService;
  private maxTentativas: number = 5;
  private loteSize: number = 10;

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
   * Processa notificações pendentes
   * Busca até 10 notificações não enviadas e tenta enviar
   */
  async processarNotificacoesPendentes(): Promise<void> {
    try {
      const pendentes = await this.buscarNotificacoesPendentes();

      if (pendentes.length === 0) {
        // Sem notificações pendentes (normal)
        return;
      }

      console.log(`\n📬 Processando ${pendentes.length} notificação(ões) pendente(s)...`);

      let enviadas = 0;
      let falhas = 0;

      for (const notif of pendentes) {
        const sucesso = await this.processarNotificacao(notif);
        if (sucesso) {
          enviadas++;
        } else {
          falhas++;
        }

        // Delay entre envios
        await this.sleep(500);
      }

      if (enviadas > 0 || falhas > 0) {
        console.log(`✅ Enviadas: ${enviadas} | ❌ Falhas: ${falhas}\n`);
      }

    } catch (error: any) {
      console.error('❌ Erro ao processar notificações pendentes:', error.message);
    }
  }

  /**
   * Busca notificações não enviadas do Supabase
   */
  private async buscarNotificacoesPendentes(): Promise<NotificacaoPendente[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('notificacoes_whatsapp')
      .select('*')
      .eq('enviada', false)
      .lt('tentativas', this.maxTentativas)
      .order('created_at', { ascending: true })
      .limit(this.loteSize);

    if (error) {
      console.error('❌ Erro ao buscar notificações pendentes:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Processa uma notificação individual
   */
  private async processarNotificacao(notif: NotificacaoPendente): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    try {
      // Tentar enviar mensagem
      const sucesso = await this.whatsappService.sendMessage(
        notif.telefone,
        notif.mensagem
      );

      if (sucesso) {
        // Marcar como enviada
        await supabase
          .from('notificacoes_whatsapp')
          .update({
            enviada: true,
            data_envio: new Date().toISOString(),
            tentativas: notif.tentativas + 1
          })
          .eq('notificacao_id', notif.notificacao_id);

        console.log(`   ✅ Notificação enviada: ${notif.tipo} - ${notif.telefone}`);
        return true;

      } else {
        // Incrementar tentativas (falha)
        await supabase
          .from('notificacoes_whatsapp')
          .update({
            tentativas: notif.tentativas + 1
          })
          .eq('notificacao_id', notif.notificacao_id);

        console.log(`   ❌ Falha no envio (tentativa ${notif.tentativas + 1}/${this.maxTentativas}): ${notif.telefone}`);
        return false;
      }

    } catch (error: any) {
      // Erro ao enviar - incrementar tentativas
      await supabase
        .from('notificacoes_whatsapp')
        .update({
          tentativas: notif.tentativas + 1
        })
        .eq('notificacao_id', notif.notificacao_id);

      console.error(`   ❌ Erro ao processar notificação ${notif.notificacao_id}:`, error.message);
      return false;
    }
  }

  /**
   * Limpa notificações antigas já enviadas (manutenção)
   * Remove notificações enviadas com mais de 30 dias
   */
  async limparNotificacoesAntigas(): Promise<void> {
    const supabase = this.supabaseService.getClient();

    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data, error } = await supabase
        .from('notificacoes_whatsapp')
        .delete()
        .eq('enviada', true)
        .lt('data_envio', dataLimite.toISOString());

      if (error) {
        console.error('❌ Erro ao limpar notificações antigas:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`🧹 Limpeza: ${data.length} notificação(ões) antiga(s) removida(s)`);
      }

    } catch (error: any) {
      console.error('❌ Erro ao limpar notificações antigas:', error.message);
    }
  }

  /**
   * Retentar notificações falhadas (após correção de problemas)
   */
  async retentarFalhadas(): Promise<void> {
    const supabase = this.supabaseService.getClient();

    try {
      // Resetar contador de tentativas de notificações não enviadas
      const { error } = await supabase
        .from('notificacoes_whatsapp')
        .update({ tentativas: 0 })
        .eq('enviada', false)
        .gte('tentativas', this.maxTentativas);

      if (error) {
        console.error('❌ Erro ao resetar tentativas:', error);
        return;
      }

      console.log('🔄 Notificações falhadas resetadas para nova tentativa');

    } catch (error: any) {
      console.error('❌ Erro ao retentar falhadas:', error.message);
    }
  }

  /**
   * Retorna estatísticas das notificações
   */
  async obterEstatisticas(): Promise<any> {
    const supabase = this.supabaseService.getClient();

    try {
      // Total pendentes
      const { count: pendentes } = await supabase
        .from('notificacoes_whatsapp')
        .select('*', { count: 'exact', head: true })
        .eq('enviada', false)
        .lt('tentativas', this.maxTentativas);

      // Total enviadas (últimas 24h)
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() - 24);

      const { count: enviadasHoje } = await supabase
        .from('notificacoes_whatsapp')
        .select('*', { count: 'exact', head: true })
        .eq('enviada', true)
        .gte('data_envio', dataLimite.toISOString());

      // Total falhadas (max tentativas)
      const { count: falhadas } = await supabase
        .from('notificacoes_whatsapp')
        .select('*', { count: 'exact', head: true })
        .eq('enviada', false)
        .gte('tentativas', this.maxTentativas);

      return {
        pendentes: pendentes || 0,
        enviadasHoje: enviadasHoje || 0,
        falhadas: falhadas || 0
      };

    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      return { pendentes: 0, enviadasHoje: 0, falhadas: 0 };
    }
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

let notificationWorkerInstance: NotificationWorker | null = null;

export function getNotificationWorker(): NotificationWorker {
  if (!notificationWorkerInstance) {
    notificationWorkerInstance = new NotificationWorker();
  }
  return notificationWorkerInstance;
}

export function setNotificationWorker(worker: NotificationWorker): void {
  notificationWorkerInstance = worker;
}

