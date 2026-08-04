import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const notificationService = readFileSync(
  new URL('../integrations/notifications/notificationService.ts', import.meta.url),
  'utf8'
);
const supabaseService = readFileSync(
  new URL('../integrations/supabase/supabaseService.ts', import.meta.url),
  'utf8'
);

assert.match(
  notificationService,
  /areas!engenheiros_projetos_area_id_fkey!inner\(descricao\)/,
  'NotificationService deve escolher a FK principal de areas'
);

assert.match(
  supabaseService,
  /areas!engenheiros_projetos_area_id_fkey!inner\(area_id, codigo, descricao\)/,
  'SupabaseService.buscarAreasDoProjeto deve escolher a FK principal de areas'
);

assert.doesNotMatch(
  notificationService,
  /areas!inner\(descricao\)/,
  'NotificationService nao deve usar embed ambiguo de areas'
);

assert.match(
  notificationService,
  /\.eq\('engenheiros\.ativo', true\)/,
  'NotificationService deve notificar apenas engenheiros ativos'
);

assert.match(
  notificationService,
  /if \(!engenheiro\.telefone\)[\s\S]*continue;/,
  'NotificationService deve ignorar engenheiros sem telefone'
);

assert.doesNotMatch(
  supabaseService,
  /areas!inner\(area_id, codigo, descricao\)/,
  'SupabaseService nao deve usar embed ambiguo de areas'
);

console.log('test-supabase-area-fk-embeds: OK');
