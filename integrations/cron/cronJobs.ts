// =====================================================
// CRON JOBS: Notificações Automáticas
// =====================================================
// Gerencia agendamentos de notificações matinais (09:00) e noturnas (17:00)
// Executa de segunda a sexta-feira
// =====================================================

import cron from 'node-cron';
import { getNotificationService } from '../notifications/notificationService.ts';
import { getNotificationWorker } from '../notifications/notificationWorker.ts';
import type { NotificationService } from '../notifications/notificationService.ts';
import type { NotificationWorker } from '../notifications/notificationWorker.ts';

// =====================================================
// CLASSE: CronJobManager
// =====================================================

export class CronJobManager {
  private notificationService: NotificationService;
  private notificationWorker: NotificationWorker;
  private morningJob: cron.ScheduledTask | null = null;
  private nightJob: cron.ScheduledTask | null = null;
  private workerJob: cron.ScheduledTask | null = null;

  constructor(notificationService?: NotificationService, notificationWorker?: NotificationWorker) {
    this.notificationService = notificationService || getNotificationService();
    this.notificationWorker = notificationWorker || getNotificationWorker();
  }

  /**
   * Inicia todos os cron jobs
   */
  start(): void {
    console.log('⏰ Iniciando Cron Jobs...\n');

    // Notificação Matinal - 09:00 (seg-sex)
    this.morningJob = cron.schedule('0 9 * * 1-5', async () => {
      console.log('\n⏰ ========================================');
      console.log('⏰ Cron Job: Notificações Matinais (09:00)');
      console.log('⏰ ========================================\n');
      
      try {
        await this.notificationService.sendMorningNotifications();
        console.log('\n✅ Notificações matinais concluídas com sucesso');
      } catch (error: any) {
        console.error('\n❌ Erro no cron matinal:', error.message);
        console.error('Stack:', error.stack);
      }
    }, {
      timezone: 'America/Sao_Paulo',
      scheduled: true
    });

    // Notificação Noturna - 17:00 (seg-sex)
    this.nightJob = cron.schedule('0 17 * * 1-5', async () => {
      console.log('\n⏰ ========================================');
      console.log('⏰ Cron Job: Notificações Noturnas (17:00)');
      console.log('⏰ ========================================\n');
      
      try {
        await this.notificationService.sendNightNotifications();
        console.log('\n✅ Notificações noturnas concluídas com sucesso');
      } catch (error: any) {
        console.error('\n❌ Erro no cron noturno:', error.message);
        console.error('Stack:', error.stack);
      }
    }, {
      timezone: 'America/Sao_Paulo',
      scheduled: true
    });

    // Worker de Notificações Pendentes - A cada 1 minuto
    this.workerJob = cron.schedule('*/1 * * * *', async () => {
      // Log silencioso - apenas quando houver notificações
      try {
        await this.notificationWorker.processarNotificacoesPendentes();
      } catch (error: any) {
        console.error('\n❌ Erro no worker de notificações:', error.message);
      }
    }, {
      timezone: 'America/Sao_Paulo',
      scheduled: true
    });

    console.log('✅ Cron Jobs iniciados com sucesso!\n');
    console.log('📅 Agendamentos configurados:');
    console.log('   🌅 Notificação Matinal:  09:00 (seg-sex)');
    console.log('   🌙 Notificação Noturna:  17:00 (seg-sex)');
    console.log('   📬 Worker Notificações:  A cada 1 minuto');
    console.log('   🌍 Timezone: America/Sao_Paulo\n');
  }

  /**
   * Para todos os cron jobs
   */
  stop(): void {
    console.log('\n⏰ Parando Cron Jobs...');

    if (this.morningJob) {
      this.morningJob.stop();
      console.log('   🌅 Notificação Matinal: parada');
    }

    if (this.nightJob) {
      this.nightJob.stop();
      console.log('   🌙 Notificação Noturna: parada');
    }

    if (this.workerJob) {
      this.workerJob.stop();
      console.log('   📬 Worker Notificações: parado');
    }

    console.log('✅ Cron Jobs parados\n');
  }

  /**
   * Dispara notificação matinal manualmente (para testes)
   */
  async triggerMorningNotification(): Promise<void> {
    console.log('\n🧪 Disparando notificação matinal manualmente...\n');
    try {
      await this.notificationService.sendMorningNotifications();
      console.log('\n✅ Notificação matinal manual concluída');
    } catch (error: any) {
      console.error('\n❌ Erro na notificação matinal manual:', error.message);
      throw error;
    }
  }

  /**
   * Dispara notificação noturna manualmente (para testes)
   */
  async triggerNightNotification(): Promise<void> {
    console.log('\n🧪 Disparando notificação noturna manualmente...\n');
    try {
      await this.notificationService.sendNightNotifications();
      console.log('\n✅ Notificação noturna manual concluída');
    } catch (error: any) {
      console.error('\n❌ Erro na notificação noturna manual:', error.message);
      throw error;
    }
  }

  /**
   * Retorna status dos cron jobs
   */
  getStatus(): { morning: string; night: string; worker: string } {
    return {
      morning: this.morningJob ? 'Ativo (09:00 seg-sex)' : 'Inativo',
      night: this.nightJob ? 'Ativo (17:00 seg-sex)' : 'Inativo',
      worker: this.workerJob ? 'Ativo (a cada 1min)' : 'Inativo'
    };
  }
}

/**
 * Singleton instance
 */
let cronJobManagerInstance: CronJobManager | null = null;

export function getCronJobManager(): CronJobManager {
  if (!cronJobManagerInstance) {
    cronJobManagerInstance = new CronJobManager();
  }
  return cronJobManagerInstance;
}

