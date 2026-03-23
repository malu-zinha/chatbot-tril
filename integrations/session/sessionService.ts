/**
 * Session Service - Redis-based persistence
 * Manages user sessions with state stack for "voltar" navigation
 */

// @ts-ignore - ioredis não está em package.json, instalar quando Redis for habilitado
import Redis from 'ioredis';

// =====================================================
// TYPES
// =====================================================

export interface StateSnapshot {
    flow_name: string | null;
    flow_step: string | null;
    context: any;
    timestamp: number;
}

export interface PersistedSession {
    whatsapp: string;
    tipo_usuario?: 'engenheiro' | 'dono' | 'nao_cadastrado';
    user_id?: string;
    fluxo_ativo?: 'engineer_project' | 'owner' | null;
    fluxo_state?: any;
    state_stack: StateSnapshot[];
    created_at: number;
    updated_at: number;
}

// =====================================================
// SESSION SERVICE
// =====================================================

export class SessionService {
    private redis: Redis;
    private readonly TTL_SECONDS = 3600; // 1 hora
    private readonly MAX_STACK_DEPTH = 10;

    constructor() {
        const redisUrl = process.env.REDIS_URL;

        if (redisUrl) {
            // Railway/Production: usa REDIS_URL
            this.redis = new Redis(redisUrl);
            console.log('✅ SessionService: Conectado ao Redis (via REDIS_URL)');
        } else {
            // Local: usa localhost
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            });
            console.log('✅ SessionService: Conectado ao Redis (local)');
        }

        this.redis.on('error', (err: any) => {
            console.error('❌ Redis Error:', err);
        });
    }

    /**
     * Carrega sessão do Redis (ou cria nova)
     */
    async getSession(whatsapp: string): Promise<PersistedSession | null> {
        const key = this.getKey(whatsapp);
        const raw = await this.redis.get(key);

        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (err) {
            console.error(`❌ Erro ao parsear sessão: ${err}`);
            return null;
        }
    }

    /**
     * Salva sessão no Redis
     */
    async saveSession(session: PersistedSession): Promise<void> {
        const key = this.getKey(session.whatsapp);
        session.updated_at = Date.now();

        // Limitar profundidade do stack
        if (session.state_stack.length > this.MAX_STACK_DEPTH) {
            session.state_stack = session.state_stack.slice(-this.MAX_STACK_DEPTH);
        }

        await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(session));
    }

    /**
     * Cria nova sessão
     */
    createSession(
        whatsapp: string,
        tipo_usuario?: 'engenheiro' | 'dono' | 'nao_cadastrado',
        user_id?: string
    ): PersistedSession {
        return {
            whatsapp,
            tipo_usuario,
            user_id,
            fluxo_ativo: null,
            fluxo_state: null,
            state_stack: [],
            created_at: Date.now(),
            updated_at: Date.now(),
        };
    }

    /**
     * Push estado na pilha
     */
    async pushState(
        whatsapp: string,
        flowName: string | null,
        flowStep: string | null,
        context: any
    ): Promise<void> {
        const session = await this.getSession(whatsapp);
        if (!session) {
            console.warn(`⚠️ Tentativa de push sem sessão: ${whatsapp}`);
            return;
        }

        const snapshot: StateSnapshot = {
            flow_name: flowName,
            flow_step: flowStep,
            context: JSON.parse(JSON.stringify(context)), // Deep copy
            timestamp: Date.now(),
        };

        session.state_stack.push(snapshot);
        await this.saveSession(session);
    }

    /**
     * Pop estado da pilha
     */
    async popState(whatsapp: string): Promise<StateSnapshot | null> {
        const session = await this.getSession(whatsapp);
        if (!session || session.state_stack.length === 0) {
            return null;
        }

        const previous = session.state_stack.pop()!;
        await this.saveSession(session);
        return previous;
    }

    /**
     * Limpa stack (útil para reset)
     */
    async clearStack(whatsapp: string): Promise<void> {
        const session = await this.getSession(whatsapp);
        if (session) {
            session.state_stack = [];
            await this.saveSession(session);
        }
    }

    /**
     * Deleta sessão
     */
    async deleteSession(whatsapp: string): Promise<void> {
        const key = this.getKey(whatsapp);
        await this.redis.del(key);
    }

    /**
     * Debug: listar todas as sessões ativas
     */
    async listActiveSessions(): Promise<string[]> {
        const keys = await this.redis.keys('session:*');
        return keys.map((k: any) => k.replace('session:', ''));
    }

    /**
     * Gera chave Redis
     */
    private getKey(whatsapp: string): string {
        return `session:${whatsapp}`;
    }

    /**
     * Fecha conexão Redis (graceful shutdown)
     */
    async close(): Promise<void> {
        await this.redis.quit();
    }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

let sessionServiceInstance: SessionService | null = null;

export function getSessionService(): SessionService {
    if (!sessionServiceInstance) {
        sessionServiceInstance = new SessionService();
    }
    return sessionServiceInstance;
}
