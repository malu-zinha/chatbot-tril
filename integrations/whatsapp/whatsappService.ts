// =====================================================
// WhatsApp Service - Abstração para múltiplos providers
// =====================================================
// Suporta dois modos:
// - Development: Apenas logs no console
// - Meta API: Envio real via WhatsApp Business API
// =====================================================

import dotenv from 'dotenv';
dotenv.config();

// =====================================================
// INTERFACE: WhatsAppProvider
// =====================================================

export interface WhatsAppProvider {
  sendMessage(to: string, message: string): Promise<boolean>;
  getProviderName(): string;
}

// =====================================================
// PROVIDER: Development (Logs apenas)
// =====================================================

class DevWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(to: string, message: string): Promise<boolean> {
    console.log('\n' + '='.repeat(60));
    console.log('📱 [DEV] Mensagem WhatsApp (simulação)');
    console.log('='.repeat(60));
    console.log(`📞 Para: ${to}`);
    console.log('💬 Mensagem:');
    console.log('-'.repeat(60));
    console.log(message);
    console.log('='.repeat(60) + '\n');
    return true;
  }

  getProviderName(): string {
    return 'Development (Console Logs)';
  }
}

// =====================================================
// PROVIDER: Meta WhatsApp Business API
// =====================================================

class MetaWhatsAppProvider implements WhatsAppProvider {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.META_PHONE_NUMBER_ID || '';
    this.apiVersion = process.env.META_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('⚠️  Meta API não configurada corretamente. Configure META_ACCESS_TOKEN e META_PHONE_NUMBER_ID no .env');
    }
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.error('❌ Meta API não configurada. Mensagem não enviada.');
      return false;
    }

    try {
      // Normalizar número de telefone (remover + e espaços)
      const phoneNumber = to.replace(/[^\d]/g, '');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro ao enviar mensagem via Meta API:', errorData);
        return false;
      }

      const data = await response.json();
      console.log(`✅ Mensagem enviada via Meta API para ${to}`);
      console.log(`   Message ID: ${data.messages?.[0]?.id || 'N/A'}`);
      return true;

    } catch (error: any) {
      console.error('❌ Erro ao enviar mensagem via Meta API:', error.message);
      return false;
    }
  }

  getProviderName(): string {
    return 'Meta WhatsApp Business API';
  }
}

// =====================================================
// SERVICE: WhatsAppService (Singleton)
// =====================================================

export class WhatsAppService {
  private provider: WhatsAppProvider;

  constructor(provider?: WhatsAppProvider) {
    // Determinar provider baseado na variável de ambiente
    const providerType = process.env.WHATSAPP_PROVIDER || 'development';

    if (provider) {
      this.provider = provider;
    } else if (providerType === 'meta') {
      this.provider = new MetaWhatsAppProvider();
    } else {
      this.provider = new DevWhatsAppProvider();
    }

    console.log(`📱 WhatsApp Provider: ${this.provider.getProviderName()}`);
  }

  /**
   * Envia mensagem via WhatsApp
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    return await this.provider.sendMessage(to, message);
  }

  /**
   * Envia múltiplas mensagens com delay entre elas
   */
  async sendMessages(messages: Array<{ to: string; message: string }>): Promise<void> {
    for (const msg of messages) {
      await this.sendMessage(msg.to, msg.message);
      // Delay de 1 segundo entre mensagens para não sobrecarregar
      await this.sleep(1000);
    }
  }

  /**
   * Retorna o nome do provider atual
   */
  getProviderName(): string {
    return this.provider.getProviderName();
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

let whatsappServiceInstance: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappServiceInstance) {
    whatsappServiceInstance = new WhatsAppService();
  }
  return whatsappServiceInstance;
}

/**
 * Permite setar um provider customizado (útil para testes)
 */
export function setWhatsAppService(service: WhatsAppService): void {
  whatsappServiceInstance = service;
}

