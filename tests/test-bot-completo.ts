#!/usr/bin/env ts-node
// =====================================================
// TESTE COMPLETO: Bot + Supabase + Sincronização
// =====================================================
// Simula bot no terminal com salvamento no Supabase
// Execute: npm run test:bot-completo
// =====================================================

import readline from 'readline';
import { messageHandler } from '../chatbot/handlers/messageHandler.ts';
import { getSupabaseService } from '../integrations/supabase/supabaseService.ts';
import { executarSincronizacao } from '../integrations/cron/syncDatabaseToSheets.ts';
import dotenv from 'dotenv';

dotenv.config();

// Cores
const c = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const TEST_USER = '+5511999999999';

console.clear();
console.log(`${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
console.log(`${c.cyan}║     🤖 TESTE COMPLETO DO BOT - Terminal                  ║${c.reset}`);
console.log(`${c.cyan}║     (Bot + Supabase + Sincronização)                     ║${c.reset}`);
console.log(`${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}\n`);

// Verificar configuração
const supabase = getSupabaseService();

if (supabase.isConnected()) {
  console.log(`${c.green}✅ Supabase conectado${c.reset}`);
} else {
  console.log(`${c.red}❌ Supabase não configurado${c.reset}`);
  console.log(`${c.yellow}   Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env${c.reset}\n`);
}

const hasSyncConfig = 
  process.env.GOOGLE_SHEETS_ENG1_ID ||
  process.env.GOOGLE_SHEETS_ENG2_ID ||
  process.env.GOOGLE_SHEETS_CEO_ID ||
  process.env.GOOGLE_SHEETS_ENGINEER_ID; // Variável antiga

if (hasSyncConfig) {
  console.log(`${c.green}✅ Sincronização configurada${c.reset}`);
} else {
  console.log(`${c.yellow}⚠️  Sincronização não configurada${c.reset}`);
  console.log(`${c.yellow}   Configure GOOGLE_SHEETS_ENG1_ID no .env para visualizar em planilhas${c.reset}\n`);
}

console.log(`${c.magenta}═══════════════════════════════════════════════════════${c.reset}\n`);
console.log(`${c.yellow}💡 Como usar:${c.reset}`);
console.log(`   • Digite como se fosse no WhatsApp`);
console.log(`   • Comandos: menu, projeto, ajuda`);
console.log(`   • Para testar sincronização: sync`);
console.log(`   • Para sair: sair\n`);
console.log(`${c.magenta}═══════════════════════════════════════════════════════${c.reset}\n`);

async function processMessage(msg: string) {
  const msgLower = msg.toLowerCase().trim();
  
  // Comandos especiais
  if (['sair', 'exit', 'quit'].includes(msgLower)) {
    console.log(`\n${c.cyan}👋 Até logo!${c.reset}\n`);
    process.exit(0);
  }
  
  if (msgLower === 'sync') {
    console.log(`\n${c.cyan}🔄 Executando sincronização manual...${c.reset}\n`);
    try {
      await executarSincronizacao();
      console.log(`\n${c.green}✅ Sincronização concluída!${c.reset}`);
      console.log(`${c.yellow}💡 Verifique suas planilhas no Google Sheets${c.reset}\n`);
    } catch (error: any) {
      console.error(`\n${c.red}❌ Erro na sincronização:${c.reset}`, error.message);
    }
    console.log(`${c.magenta}───────────────────────────────────────────────────────${c.reset}\n`);
    rl.prompt();
    return;
  }

  console.log(`${c.cyan}💬 Você: ${msg}${c.reset}\n`);
  
  try {
    const response = await messageHandler.processarMensagem(TEST_USER, msg);
    
    console.log(`${c.green}🤖 Bot:${c.reset}`);
    console.log(response.resposta);
    
    // Indicar se salvou no banco
    if (response.resposta.includes('Dados salvos no banco de dados')) {
      console.log(`\n${c.magenta}💾 Projeto salvo no Supabase!${c.reset}`);
      console.log(`${c.yellow}🔄 Planilhas serão atualizadas em até 5 minutos${c.reset}`);
      console.log(`${c.yellow}   Ou digite 'sync' para sincronizar agora${c.reset}`);
    }
    
    console.log(`\n${c.magenta}───────────────────────────────────────────────────────${c.reset}\n`);
  } catch (error: any) {
    console.error(`\n${c.red}❌ Erro:${c.reset}`, error.message);
    console.log(`\n${c.magenta}───────────────────────────────────────────────────────${c.reset}\n`);
  }
  
  rl.prompt();
}

// Enviar mensagem inicial
(async () => {
  console.log(`${c.cyan}💬 Você: oi${c.reset}\n`);
  const welcome = await messageHandler.processarMensagem(TEST_USER, 'oi');
  console.log(`${c.green}🤖 Bot:${c.reset}`);
  console.log(welcome.resposta);
  console.log(`\n${c.magenta}───────────────────────────────────────────────────────${c.reset}\n`);
  
  rl.setPrompt(`${c.cyan}💬 Você: ${c.reset}`);
  rl.prompt();
  
  rl.on('line', processMessage);
  rl.on('close', () => {
    console.log(`\n${c.cyan}👋 Até logo!${c.reset}\n`);
    process.exit(0);
  });
})();

