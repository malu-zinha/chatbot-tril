// =====================================================
// CRON JOBS: Notificações Automáticas
// =====================================================
// Gerencia agendamentos de notificações matinais (11:20) e noturnas (16:30)
// Executa de segunda a sexta-feira
// =====================================================

import cron from 'node-cron';
import { getNotificationService } from '../notifications/notificationService.ts';
import { getNotificationWorker } from '../notifications/notificationWorker.ts';
import { getSupabaseService } from '../supabase/supabaseService.ts';
import type { NotificationService } from '../notifications/notificationService.ts';
import type { NotificationWorker } from '../notifications/notificationWorker.ts';

export const MORNING_NOTIFICATION_CRON = '20 11 * * 1-5';
export const NIGHT_NOTIFICATION_CRON = '30 16 * * 1-5';
export const WORKER_NOTIFICATION_CRON = '*/1 * * * *';
export const PROJECT_CLEANUP_CRON = '0 3 1 */6 *';
export const CRON_TIMEZONE = 'America/Sao_Paulo';

// =====================================================
// CLASSE: CronJobManager
// =====================================================

export class CronJobManager {
  private notificationService: NotificationService;
  private notificationWorker: NotificationWorker;
  private morningJob: cron.ScheduledTask | null = null;
  private nightJob: cron.ScheduledTask | null = null;
  private workerJob: cron.ScheduledTask | null = null;
  private cleanupJob: cron.ScheduledTask | null = null;

  constructor(notificationService?: NotificationService, notificationWorker?: NotificationWorker) {
    this.notificationService = notificationService || getNotificationService();
    this.notificationWorker = notificationWorker || getNotificationWorker();
  }

  /**
   * Inicia todos os cron jobs
   */
  start(): void {
    console.log('⏰ Iniciando Cron Jobs...\n');

    // Notificação Matinal - 11:20 (seg-sex)
    this.morningJob = cron.schedule(MORNING_NOTIFICATION_CRON, async () => {
      console.log('\n⏰ ========================================');
      console.log('⏰ Cron Job: Notificações Matinais (11:20)');
      console.log('⏰ ========================================\n');
      
      try {
        await this.notificationService.sendMorningNotifications();
        console.log('\n✅ Notificações matinais concluídas com sucesso');
      } catch (error: any) {
        console.error('\n❌ Erro no cron matinal:', error.message);
        console.error('Stack:', error.stack);
      }
    }, {
      timezone: CRON_TIMEZONE,
      scheduled: true
    });

    // Notificação Noturna - 16:30 (seg-sex)
    this.nightJob = cron.schedule(NIGHT_NOTIFICATION_CRON, async () => {
      console.log('\n⏰ ========================================');
      console.log('⏰ Cron Job: Notificações Noturnas (16:30)');
      console.log('⏰ ========================================\n');
      
      try {
        await this.notificationService.sendNightNotifications();
        console.log('\n✅ Notificações noturnas concluídas com sucesso');
      } catch (error: any) {
        console.error('\n❌ Erro no cron noturno:', error.message);
        console.error('Stack:', error.stack);
      }
    }, {
      timezone: CRON_TIMEZONE,
      scheduled: true
    });

    // Worker de Notificações Pendentes - A cada 1 minuto
    this.workerJob = cron.schedule(WORKER_NOTIFICATION_CRON, async () => {
      // Log silencioso - apenas quando houver notificações
      try {
        await this.notificationWorker.processarNotificacoesPendentes();
      } catch (error: any) {
        console.error('\n❌ Erro no worker de notificações:', error.message);
      }
    }, {
      timezone: CRON_TIMEZONE,
      scheduled: true
    });

    if (process.env.ENABLE_PROJECT_CLEANUP_CRON === 'true') {
      this.cleanupJob = cron.schedule(PROJECT_CLEANUP_CRON, async () => {
        console.log('\n⏰ ========================================');
        console.log('⏰ Cron Job: Limpeza semestral de projetos finalizados');
        console.log('⏰ ========================================\n');

        try {
          const resultado = await getSupabaseService().limparProjetosFinalizadosAntigos(6, false);
          console.log('✅ Limpeza semestral concluída:', resultado);
        } catch (error: any) {
          console.error('\n❌ Erro no cron de limpeza semestral:', error.message);
          console.error('Stack:', error.stack);
        }
      }, {
        timezone: CRON_TIMEZONE,
        scheduled: true
      });
    }

    console.log('✅ Cron Jobs iniciados com sucesso!\n');
    console.log('📅 Agendamentos configurados:');
    console.log('   🌅 Notificação Matinal:  11:20 (seg-sex)');
    console.log('   🌙 Notificação Noturna:  16:30 (seg-sex)');
    console.log('   📬 Worker Notificações:  A cada 1 minuto');
    console.log(`   🧹 Limpeza Projetos: ${this.cleanupJob ? 'Ativa (semestral)' : 'Inativa'}`);
    console.log(`   🌍 Timezone: ${CRON_TIMEZONE}\n`);
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

    if (this.cleanupJob) {
      this.cleanupJob.stop();
      console.log('   🧹 Limpeza Projetos: parada');
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
      morning: this.morningJob ? 'Ativo (11:20 seg-sex)' : 'Inativo',
      night: this.nightJob ? 'Ativo (16:30 seg-sex)' : 'Inativo',
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

