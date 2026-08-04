import dotenv from 'dotenv';
import { NotificationService } from '../integrations/notifications/notificationService.ts';

dotenv.config();

class FakeWhatsAppService {
  sent: Array<{ to: string; message: string }> = [];

  async sendMessage(to: string, message: string): Promise<boolean> {
    this.sent.push({ to, message });
    return true;
  }

  getProviderName(): string {
    return 'Fake WhatsApp';
  }
}

async function main() {
  const fake = new FakeWhatsAppService();
  const service = new NotificationService(fake as any);

  await service.sendMorningNotifications();

  if (fake.sent.length === 0) {
    throw new Error('Dry-run nao gerou nenhuma notificacao matinal');
  }

  console.log(`test-notifications-dry-run: OK (${fake.sent.length} notificacoes simuladas)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
