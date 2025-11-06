// Teste rápido de autenticação Google Sheets
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function testAuth() {
  console.log('🧪 Testando autenticação Google Sheets...\n');
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    console.log(`📊 ID da Planilha: ${spreadsheetId}\n`);
    
    // Tentar ler apenas metadados (não precisa do range)
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('✅ Autenticação OK!');
    console.log(`✅ Planilha encontrada: ${response.data.properties.title}`);
    console.log(`✅ Total de abas: ${response.data.sheets.length}\n`);
    
    console.log('📑 Abas disponíveis:');
    response.data.sheets.forEach((sheet, i) => {
      console.log(`   ${i + 1}. ${sheet.properties.title}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.message.includes('not supported')) {
      console.error('\n💡 Dica: O ID pode estar incorreto ou não é uma planilha do Google Sheets');
    } else if (error.message.includes('permission')) {
      console.error('\n💡 Dica: Compartilhe a planilha com: tecpred-tril@tecpred-tril.iam.gserviceaccount.com');
    }
  }
}

testAuth();

