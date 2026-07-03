import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  'supabase/migrations/20260703_dashboard_evandro_tasks_updated_at.sql'
)
const sql = readFileSync(migrationPath, 'utf8')

assert.match(
  sql,
  /ALTER TABLE evandro_distribuicao_tasks\s+ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW\(\);/
)

console.log('test-dashboard-evandro-updated-at-migration: OK')
