// =====================================================
// SERVICE: Notification Service
// =====================================================
// Gerencia envio de notificações automáticas matinais e noturnas
// Uma mensagem por projeto ativo
// =====================================================

import { getEngineerSheetService } from '../sheets/engineerSheetService.ts';
import type { Project } from '../sheets/engineerSheetService.ts';

// =====================================================
// CLASSE: NotificationService
// =====================================================

export class NotificationService {
  private engineerService;
  private whatsappClient: any; // Cliente do WhatsApp (será injetado)
  private messageHandler: any; // MessageHandler para gerenciar contexto

  constructor(whatsappClient?: any, messageHandler?: any) {
    this.engineerService = getEngineerSheetService();
    this.whatsappClient = whatsappClient;
    this.messageHandler = messageHandler;
  }

  /**
   * Define o cliente WhatsApp
   */
  setWhatsAppClient(client: any): void {
    this.whatsappClient = client;
  }

  /**
   * Define o MessageHandler
   */
  setMessageHandler(handler: any): void {
    this.messageHandler = handler;
  }

  /**
   * Envia notificações matinais para todos os projetos ativos
   * UMA MENSAGEM POR PROJETO
   */
  async sendMorningNotifications(): Promise<void> {
    console.log('🌅 Iniciando notificações matinais...');

    try {
      const activeProjects = await this.engineerService.listActiveProjects();

      console.log(`📊 Projetos ativos encontrados: ${activeProjects.length}`);

      if (activeProjects.length === 0) {
        console.log('⚠️ Nenhum projeto ativo para notificar');
        return;
      }

      // UMA MENSAGEM POR PROJETO
      for (const project of activeProjects) {
        try {
          // TODO: Buscar WhatsApp do engenheiro responsável
          // Por enquanto, assumir que cada projeto tem um campo 'whatsapp' ou usar um padrão
          const whatsapp = project.codigo; // Placeholder - precisa implementar lógica real

          const message = this.formatMorningNotification(project);

          // Enviar mensagem
          if (this.whatsappClient) {
            await this.sendWhatsAppMessage(whatsapp, message, project.codigo, 'matinal');
          } else {
            console.log(`[SIMULAÇÃO] Mensagem matinal para ${project.codigo}:\n${message}`);
          }

          console.log(`✅ Notificação matinal enviada: ${project.codigo}`);

          // Pequeno delay entre mensagens para não sobrecarregar
          await this.sleep(1000);
        } catch (error: any) {
          console.error(`❌ Erro ao enviar notificação para ${project.codigo}:`, error.message);
        }
      }

      console.log('✅ Notificações matinais concluídas');
    } catch (error: any) {
      console.error('❌ Erro ao buscar projetos ativos:', error.message);
      throw error;
    }
  }

  /**
   * Envia notificações noturnas para todos os projetos ativos
   * UMA MENSAGEM POR PROJETO
   */
  async sendNightNotifications(): Promise<void> {
    console.log('🌙 Iniciando notificações noturnas...');

    try {
      const activeProjects = await this.engineerService.listActiveProjects();

      console.log(`📊 Projetos ativos encontrados: ${activeProjects.length}`);

      if (activeProjects.length === 0) {
        console.log('⚠️ Nenhum projeto ativo para notificar');
        return;
      }

      // UMA MENSAGEM POR PROJETO
      for (const project of activeProjects) {
        try {
          // TODO: Buscar WhatsApp do engenheiro responsável
          const whatsapp = project.codigo; // Placeholder

          const message = this.formatNightNotification(project);

          // Enviar mensagem
          if (this.whatsappClient) {
            await this.sendWhatsAppMessage(whatsapp, message, project.codigo, 'noturna');
          } else {
            console.log(`[SIMULAÇÃO] Mensagem noturna para ${project.codigo}:\n${message}`);
          }

          console.log(`✅ Notificação noturna enviada: ${project.codigo}`);

          // Pequeno delay entre mensagens
          await this.sleep(1000);
        } catch (error: any) {
          console.error(`❌ Erro ao enviar notificação para ${project.codigo}:`, error.message);
        }
      }

      console.log('✅ Notificações noturnas concluídas');
    } catch (error: any) {
      console.error('❌ Erro ao buscar projetos ativos:', error.message);
      throw error;
    }
  }

  /**
   * Formata mensagem de notificação matinal
   */
  private formatMorningNotification(project: Project): string {
    let mensagem = `🌅 *Notificação Matinal*\n\n`;
    mensagem += `📊 Projeto: *${project.codigo}*\n`;
    mensagem += `👤 Cliente: ${project.cliente}\n`;
    mensagem += `🏗️ Obra: ${project.obra}\n`;
    mensagem += `📍 Status atual: ${project.status}\n\n`;
    mensagem += `Por favor, atualize:\n`;
    mensagem += `1️⃣ Status do projeto\n`;
    mensagem += `2️⃣ Previsão para o dia\n\n`;
    mensagem += `_Responda a esta mensagem para iniciar_`;

    return mensagem;
  }

  /**
   * Formata mensagem de notificação noturna
   */
  private formatNightNotification(project: Project): string {
    let mensagem = `🌙 *Notificação Noturna*\n\n`;
    mensagem += `📊 Projeto: *${project.codigo}*\n`;
    mensagem += `👤 Cliente: ${project.cliente}\n`;
    mensagem += `🏗️ Obra: ${project.obra}\n`;
    mensagem += `📍 Etapa atual: ${project.etapa}\n\n`;
    mensagem += `Por favor, registre:\n`;
    mensagem += `1️⃣ O que foi feito hoje\n`;
    mensagem += `2️⃣ Houve retrabalho?\n`;
    mensagem += `3️⃣ Etapa atual\n`;
    mensagem += `4️⃣ Observações (obrigatório)\n\n`;
    mensagem += `_Responda a esta mensagem para iniciar_`;

    return mensagem;
  }

  /**
   * Envia mensagem via WhatsApp e registra contexto de notificação
   */
  private async sendWhatsAppMessage(
    whatsapp: string,
    message: string,
    projectCode: string,
    tipo: 'matinal' | 'noturna'
  ): Promise<void> {
    if (!this.whatsappClient) {
      throw new Error('WhatsApp client não configurado');
    }

    // TODO: Implementar envio real via whatsapp-web.js
    // await this.whatsappClient.sendMessage(whatsapp, message);

    // Registrar contexto de notificação no MessageHandler
    if (this.messageHandler) {
      // O MessageHandler deve guardar que este usuário está respondendo
      // a uma notificação específica
      this.messageHandler.setNotificationContext(whatsapp, {
        projectCode,
        tipo
      });
    }
  }

  /**
   * Utilitário: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

