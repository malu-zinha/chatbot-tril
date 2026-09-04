// =====================================================
// SEGURANÇA: Redação de segredos em mensagens e logs
// =====================================================
// Nenhuma credencial pode sair do backend — nem para o
// WhatsApp, nem para uma resposta HTTP, nem para o log.
//
// O incidente que originou este módulo: uma Secret Key
// malformada gerou a exceção
//   TypeError: Headers.set: "sb_secret_..." is an invalid
//   header value
// e o valor apareceu no navegador. O segredo veio de dentro
// da mensagem de uma exceção do runtime, não de um campo
// previsto — por isso a varredura de process.env abaixo é a
// parte mais importante daqui: ela pega o valor mesmo quando
// ele aparece num texto que ninguém antecipou.
//
// ATENÇÃO: existe uma cópia deste arquivo em
// dashboard/lib/apiError.ts. O dashboard é um projeto npm
// separado (tsconfig da raiz não o inclui) e não consegue
// importar de logic/. Ao alterar as regras aqui, alterar lá.
// =====================================================

const MASK = '***';

/** Nomes de variáveis de ambiente cujo VALOR nunca pode aparecer em texto. */
const SENSITIVE_ENV_NAME = /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|CREDENTIAL|DSN/i;

/** Valores curtos demais para serem segredo — mascará-los só geraria ruído. */
const MIN_SECRET_LENGTH = 12;

interface Pattern {
  regex: RegExp;
  replacement: string;
}

// Preservamos um prefixo curto de propósito: "sb_secret_***" diz ao
// desenvolvedor QUAL credencial está envolvida sem revelar nenhuma
// parte utilizável dela.
const PATTERNS: Pattern[] = [
  // Supabase (formato novo)
  { regex: /sb_secret_[A-Za-z0-9_-]+/g, replacement: `sb_secret_${MASK}` },
  { regex: /sb_publishable_[A-Za-z0-9_-]+/g, replacement: `sb_publishable_${MASK}` },

  // JWT (Supabase legado, tokens de sessão, service role antigo)
  { regex: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, replacement: `eyJ${MASK}` },

  // OpenAI
  { regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replacement: `sk-${MASK}` },

  // Twilio (Account SID e API Key SID acompanham o Auth Token nos mesmos logs)
  { regex: /\bAC[0-9a-fA-F]{32}\b/g, replacement: `AC${MASK}` },
  { regex: /\bSK[0-9a-fA-F]{32}\b/g, replacement: `SK${MASK}` },

  // Senha dentro de connection string
  { regex: /(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, replacement: `$1${MASK}@` },

  // Authorization / Bearer
  { regex: /\bBearer\s+[A-Za-z0-9._-]+/gi, replacement: `Bearer ${MASK}` },

  // apikey=..., "apiKey": "...", authorization: ...
  {
    regex: /\b(authorization|apikey|api[_-]?key|x-api-key)(["']?\s*[:=]\s*["']?)([^\s"',}&]+)/gi,
    replacement: `$1$2${MASK}`,
  },
];

/**
 * Converte qualquer valor em texto sem perder a informação útil de um Error.
 */
function toText(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') return input;

  if (input instanceof Error) {
    const stack = input.stack ? `\n${input.stack}` : '';
    return `${input.name}: ${input.message}${stack}`;
  }

  if (typeof input === 'object') {
    try {
      return JSON.stringify(input);
    } catch {
      // Referência circular ou getter que lança — cai no String() abaixo.
    }
  }

  return String(input);
}

/**
 * Substitui os valores literais de variáveis de ambiente sensíveis.
 *
 * Roda ANTES dos padrões por regex: aqui a comparação é exata, então pega
 * credenciais de formato desconhecido (Google, Meta, Redis) que nenhum
 * padrão cobriria.
 */
function redactEnvValues(text: string): string {
  let output = text;

  for (const [name, value] of Object.entries(process.env)) {
    if (!value || value.length < MIN_SECRET_LENGTH) continue;
    if (!SENSITIVE_ENV_NAME.test(name)) continue;

    // split/join em vez de RegExp: o valor pode conter caracteres especiais
    // de regex e escapá-los seria mais frágil do que a busca literal.
    if (output.includes(value)) {
      output = output.split(value).join(`[REDACTED:${name}]`);
    }

    const trimmed = value.trim();
    if (trimmed !== value && trimmed.length >= MIN_SECRET_LENGTH && output.includes(trimmed)) {
      output = output.split(trimmed).join(`[REDACTED:${name}]`);
    }
  }

  return output;
}

/**
 * Mascara credenciais em qualquer valor antes de logar, responder ou exibir.
 *
 * Seguro para aplicar em texto que já está limpo — é idempotente.
 */
export function redactSecrets(input: unknown): string {
  let text = redactEnvValues(toText(input));

  for (const { regex, replacement } of PATTERNS) {
    text = text.replace(regex, replacement);
  }

  return text;
}

/**
 * Log padronizado de falha do Supabase.
 *
 * Registra apenas escopo, código e mensagem já redigida — nunca o objeto de
 * erro inteiro, que pode carregar headers e a própria Secret Key.
 */
export function logSupabaseError(scope: string, error: unknown): void {
  const parts = [`[Supabase] ${scope}`];

  if (error && typeof error === 'object') {
    const { code, status } = error as { code?: unknown; status?: unknown };
    if (code !== undefined && code !== null) parts.push(`code=${redactSecrets(code)}`);
    if (status !== undefined && status !== null) parts.push(`status=${redactSecrets(status)}`);
  }

  const message = redactSecrets(
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : error
  );
  if (message) parts.push(message);

  console.error(parts.join(' | '));
}
