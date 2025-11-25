import dotenv from 'dotenv';
import { getGoogleSheetsService } from './src/services/googleSheetsService.ts';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '';
const ENGINEER_SHEET = process.env.GOOGLE_SHEETS_ENGINEER_SHEET || 'Engenheiro';
const EVANDRO_SHEET = process.env.GOOGLE_SHEETS_EVANDRO_SHEET || 'Evandro';

console.log('🔍 VERIFICANDO ESTRUTURA DAS PLANILHAS\n');

async function verificar() {
  try {
    const sheetsService = getGoogleSheetsService();
    
    // Verificar aba Engenheiro
    console.log('📊 ABA ENGENHEIRO:');
    const engineerData = await sheetsService.readSheet(SPREADSHEET_ID, `${ENGINEER_SHEET}!A1:Z1000`);
    console.log(`   Headers: ${engineerData.headers.join(' | ')}`);
    console.log(`   Total de registros: ${engineerData.rows.length}`);
    
    if (engineerData.rows.length > 0) {
      console.log(`   Primeira linha: ${engineerData.rows[0].join(' | ')}`);
    }
    
    console.log('\n📊 ABA EVANDRO:');
    try {
      const evandroData = await sheetsService.readSheet(SPREADSHEET_ID, `${EVANDRO_SHEET}!A1:Z1000`);
      console.log(`   Headers: ${evandroData.headers.join(' | ')}`);
      console.log(`   Total de registros: ${evandroData.rows.length}`);
      
      if (evandroData.rows.length > 0) {
        console.log(`   Primeira linha: ${evandroData.rows[0].join(' | ')}`);
      }
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
      console.log(`   → A aba "${EVANDRO_SHEET}" pode não existir ou não ter permissão`);
    }
    
    console.log('\n✅ Verificação completa!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificar();

