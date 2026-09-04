// =====================================================
// SEGURANÇA: redação de segredos e leitura de credenciais
// =====================================================
// CÓPIA DELIBERADA de logic/security/redactSecrets.ts e
// logic/security/envSecret.ts.
//
// O dashboard é um projeto npm separado, com o próprio
// package.json, o próprio node_modules e um tsconfig que não
// alcança logic/. Importar de lá exigiria transformar o repo
// em workspace — mudança estrutural grande num sistema em
// produção. Ao alterar as regras aqui, alterar lá também.
// =====================================================

const MASK = '***'

const SENSITIVE_ENV_NAME = /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|CREDENTIAL|DSN/i

const MIN_SECRET_LENGTH = 12

const PATTERNS: { regex: RegExp; replacement: string }[] = [
  { regex: /sb_secret_[A-Za-z0-9_-]+/g, replacement: `sb_secret_${MASK}` },
  { regex: /sb_publishable_[A-Za-z0-9_-]+/g, replacement: `sb_publishable_${MASK}` },
  { regex: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, replacement: `eyJ${MASK}` },
  { regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replacement: `sk-${MASK}` },
  { regex: /\bAC[0-9a-fA-F]{32}\b/g, replacement: `AC${MASK}` },
  { regex: /\bSK[0-9a-fA-F]{32}\b/g, replacement: `SK${MASK}` },
  { regex: /(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, replacement: `$1${MASK}@` },
  { regex: /\bBearer\s+[A-Za-z0-9._-]+/gi, replacement: `Bearer ${MASK}` },
  {
    regex: /\b(authorization|apikey|api[_-]?key|x-api-key)(["']?\s*[:=]\s*["']?)([^\s"',}&]+)/gi,
    replacement: `$1$2${MASK}`,
  },
]

function toText(input: unknown): string {
  if (input === null || input === undefined) return ''
  if (typeof input === 'string') return input

  if (input instanceof Error) {
    const stack = input.stack ? `\n${input.stack}` : ''
    return `${input.name}: ${input.message}${stack}`
  }

  if (typeof input === 'object') {
    try {
      return JSON.stringify(input)
    } catch {
      // circular / getter que lança
    }
  }

  return String(input)
}

/**
 * Substitui os valores literais das variáveis de ambiente sensíveis.
 *
 * Só roda no servidor: no browser `process.env` contém apenas as
 * NEXT_PUBLIC_*, que são públicas por definição.
 */
function redactEnvValues(text: string): string {
  let output = text

  if (typeof process === 'undefined' || !process.env) return output

  for (const [name, value] of Object.entries(process.env)) {
    if (!value || value.length < MIN_SECRET_LENGTH) continue
    if (!SENSITIVE_ENV_NAME.test(name)) continue

    if (output.includes(value)) {
      output = output.split(value).join(`[REDACTED:${name}]`)
    }

    const trimmed = value.trim()
    if (trimmed !== value && trimmed.length >= MIN_SECRET_LENGTH && output.includes(trimmed)) {
      output = output.split(trimmed).join(`[REDACTED:${name}]`)
    }
  }

  return output
}

/** Mascara credenciais em qualquer valor antes de logar ou exibir. Idempotente. */
export function redactSecrets(input: unknown): string {
  let text = redactEnvValues(toText(input))

  for (const { regex, replacement } of PATTERNS) {
    text = text.replace(regex, replacement)
  }

  return text
}

// =====================================================
// Leitura defensiva de credenciais
// =====================================================

/** Tab + ASCII imprimível: o que é aceito num header HTTP. */
const HEADER_SAFE = /^[\t\x20-\x7E]*$/

export class InvalidCredentialError extends Error {
  constructor(public readonly variableName: string) {
    super(`A credencial em ${variableName} contém caracteres inválidos.`)
    this.name = 'InvalidCredentialError'
  }
}

export function isHeaderSafe(value: string): boolean {
  return HEADER_SAFE.test(value)
}

/**
 * Lê uma variável de ambiente, faz trim e valida o formato de header.
 *
 * Devolve '' quando ausente. Lança quando o valor existe mas contém \r, \n ou
 * outro caractere que quebraria o fetch — a mensagem nunca inclui o valor.
 */
export function readCredential(name: string): string {
  const raw = process.env[name]
  if (raw === undefined || raw === null) return ''

  const value = raw.trim()
  if (!value) return ''

  if (!isHeaderSafe(value)) throw new InvalidCredentialError(name)

  return value
}
