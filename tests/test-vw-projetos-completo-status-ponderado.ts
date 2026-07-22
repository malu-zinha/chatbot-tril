import { existsSync, readFileSync } from 'fs';

const migrationPath = 'supabase/migrations/20260722_fix_vw_projetos_completo_status_ponderado.sql';

let pass = 0, fail = 0;
function assert(cond: boolean, name: string) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.error(`❌ ${name}`); }
}

assert(existsSync(migrationPath), 'migration de regressao da vw_projetos_completo existe');

const sql = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';

assert(
  /CREATE\s+OR\s+REPLACE\s+VIEW\s+vw_projetos_completo/i.test(sql),
  'migration recria vw_projetos_completo'
);
assert(
  /WHEN\s+COALESCE\(ep\.percentual_ponderado,\s*0\)\s*>=\s*100\s+THEN\s+'Conclu[ií]do'/i.test(sql),
  'status_descricao deriva conclusao de ep.percentual_ponderado >= 100'
);
assert(
  /\(COALESCE\(ep\.percentual_ponderado,\s*0\)\)::NUMERIC\(5,\s*2\)\s+AS\s+percentual_andamento/i.test(sql),
  'percentual_andamento usa ep.percentual_ponderado mantendo NUMERIC(5,2)'
);
assert(
  !/s\.descricao\s+AS\s+status_descricao/i.test(sql),
  'view nao usa status_codes.descricao como status_descricao'
);
assert(
  /DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_sync_status_previsao_to_engenheiros\s+ON\s+projetos_previsao/i.test(sql),
  'migration remove trigger legado que sincroniza status da previsao'
);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
