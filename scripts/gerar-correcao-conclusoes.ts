import { readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import {
  generateCorrectionSql,
  parseApprovalCsv,
  type ConclusionApproval,
} from '../logic/auditoria/conclusaoAudit.ts';

interface CliOptions {
  input: string;
  output?: string;
  apply: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let input = '';
  let output: string | undefined;
  let apply = false;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
    } else if (arg.startsWith('--input=')) {
      input = arg.slice('--input='.length);
    } else if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Argumento invalido: ${arg}`);
    }
  }

  if (!input) {
    throw new Error('Informe --input=<arquivo.csv|arquivo.json>');
  }

  return { input, output, apply };
}

function printHelp() {
  console.log(`Uso:
  npx tsx scripts/gerar-correcao-conclusoes.ts --input=aprovacao.csv
  npx tsx scripts/gerar-correcao-conclusoes.ts --input=aprovacao.csv --output=correcao.sql
  npx tsx scripts/gerar-correcao-conclusoes.ts --input=aprovacao.csv --apply --output=correcao-apply.sql

Padrao: gera SQL dry-run com ROLLBACK e sem updates.
Com --apply: gera SQL transacional com updates e COMMIT, mas NAO executa no banco.`);
}

function parseApprovalJson(content: string): ConclusionApproval[] {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON de aprovacao deve ser um array');
  }
  return parsed as ConclusionApproval[];
}

function readApprovals(path: string): ConclusionApproval[] {
  const content = readFileSync(path, 'utf8');
  const extension = extname(path).toLowerCase();

  if (extension === '.json') {
    return parseApprovalJson(content);
  }

  return parseApprovalCsv(content);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const approvals = readApprovals(options.input);
  const sql = generateCorrectionSql(approvals, { apply: options.apply });

  if (options.output) {
    writeFileSync(options.output, sql, 'utf8');
    console.log(`SQL gerado em ${options.output} (${options.apply ? 'apply' : 'dry-run'})`);
  } else {
    console.log(sql);
  }
}

main();
