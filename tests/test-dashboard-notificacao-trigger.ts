import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  'supabase/migrations/20260703_dashboard_corrigir_notificacao_task_fk.sql'
)
const sql = readFileSync(migrationPath, 'utf8')

const syncFunction = sql.match(
  /CREATE OR REPLACE FUNCTION sincronizar_task_para_engenheiro\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/
)?.[0]
const notifyFunction = sql.match(
  /CREATE OR REPLACE FUNCTION notificar_task_criada\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/
)?.[0]

assert.ok(syncFunction, 'migration must recreate sincronizar_task_para_engenheiro')
assert.ok(notifyFunction, 'migration must create notificar_task_criada')
assert.ok(
  !syncFunction.includes('INSERT INTO notificacoes_whatsapp'),
  'BEFORE trigger function must not insert notifications because task FK is not visible yet'
)
assert.ok(
  notifyFunction.includes('INSERT INTO notificacoes_whatsapp'),
  'AFTER trigger function must insert WhatsApp notification after task row exists'
)
assert.match(sql, /CREATE TRIGGER trg_sincronizar_task\s+BEFORE INSERT ON evandro_distribuicao_tasks/)
assert.match(sql, /CREATE TRIGGER trg_notificar_task\s+AFTER INSERT ON evandro_distribuicao_tasks/)
assert.match(sql, /NEW\.task_id/)

console.log('test-dashboard-notificacao-trigger: OK')
