// =====================================================
// SEGURANÇA: Leitura defensiva de credenciais do ambiente
// =====================================================
// Um valor malformado (quebra de linha colada ao copiar a
// chave para o painel do Railway, espaço no fim) chega até o
// createClient e explode dentro do fetch com
//   TypeError: Headers.set: "<valor>" is an invalid header value
// — expondo a credencial na mensagem da exceção.
//
// Aqui a chave é validada ANTES de virar header. Em nenhuma
// hipótese o valor entra na mensagem de erro.
//
// ATENÇÃO: existe uma cópia deste código em
// dashboard/lib/apiError.ts (projeto npm separado).
// =====================================================

/**
 * Caracteres aceitos num header HTTP: tab e ASCII imprimível.
 * Qualquer coisa fora disso — \r, \n, controle, byte não-ASCII —
 * torna o valor inválido como header.
 */
const HEADER_SAFE = /^[\t\x20-\x7E]*$/;

export class InvalidCredentialError extends Error {
  constructor(public readonly variableName: string) {
    super(`A credencial em ${variableName} contém caracteres inválidos.`);
    this.name = 'InvalidCredentialError';
  }
}

export class MissingCredentialError extends Error {
  constructor(public readonly variableName: string) {
    super(`Credencial não configurada: ${variableName}.`);
    this.name = 'MissingCredentialError';
  }
}

/** true quando o valor pode ser usado como header HTTP sem quebrar o fetch. */
export function isHeaderSafe(value: string): boolean {
  return HEADER_SAFE.test(value);
}

/**
 * Lê uma variável de ambiente, faz trim e valida o formato.
 *
 * Devolve '' quando a variável não está definida — cabe ao chamador decidir
 * se isso é fatal (dashboard) ou se degrada para outro modo (chatbot com
 * Google Sheets). Já um valor PRESENTE e malformado sempre lança: seguir com
 * ele só adiaria a falha para dentro do fetch, com o valor no meio da
 * mensagem.
 *
 * @throws {InvalidCredentialError} valor presente com caracteres inválidos.
 */
export function readCredential(name: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return '';

  const value = raw.trim();
  if (!value) return '';

  if (!isHeaderSafe(value)) {
    throw new InvalidCredentialError(name);
  }

  return value;
}

/**
 * Igual a readCredential, mas exige que a variável esteja configurada.
 *
 * @throws {MissingCredentialError} variável ausente ou vazia.
 * @throws {InvalidCredentialError} valor com caracteres inválidos.
 */
export function requireCredential(name: string): string {
  const value = readCredential(name);
  if (!value) throw new MissingCredentialError(name);
  return value;
}
