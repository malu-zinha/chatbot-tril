import dotenv from 'dotenv';
import { getGoogleSheetsService } from './src/services/googleSheetsService.ts';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '';
const ENGINEER_SHEET = process.env.GOOGLE_SHEETS_ENGINEER_SHEET || 'Engenheiro';
const EVANDRO_SHEET = process.env.GOOGLE_SHEETS_EVANDRO_SHEET || 'Evandro';
const SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'A2:M1000';

console.log('📋 COPIAR PROJETOS DA ABA ENGENHEIRO PARA EVANDRO\n');

async function copiarProjetos() {
  try {
    const sheetsService = getGoogleSheetsService();
    
    // Ler projetos da aba Engenheiro
    console.log('📊 Lendo projetos da aba Engenheiro...');
    const engineerFullRange = `${ENGINEER_SHEET}!${SHEET_RANGE}`;
    const engineerData = await sheetsService.readSheetAsObjects(SPREADSHEET_ID, engineerFullRange);
    
    console.log(`   Encontrados: ${engineerData.length} projetos\n`);
    
    // Ler projetos da aba Evandro
    console.log('📊 Lendo projetos da aba Evandro...');
    const evandroFullRange = `${EVANDRO_SHEET}!${SHEET_RANGE}`;
    const evandroData = await sheetsService.readSheetAsObjects(SPREADSHEET_ID, evandroFullRange);
    const evandroIds = new Set(evandroData.map(p => p['Nº']).filter(Boolean));
    
    console.log(`   Encontrados: ${evandroData.length} projetos\n`);
    
    // Obter headers da aba Evandro
    const evandroHeaders = await sheetsService.getHeaders(SPREADSHEET_ID, EVANDRO_SHEET);
    console.log(`📋 Headers Evandro: ${evandroHeaders.join(', ')}\n`);
    
    // Campos em comum
    const COMMON_FIELDS = ['Nº', 'Cliente', 'Obra', 'Área', 'Status do Projeto'];
    
    // Copiar projetos que não existem em Evandro
    let copiados = 0;
    
    for (const project of engineerData) {
      const projectId = project['Nº'];
      
      if (!projectId) {
        console.log(`⚠️  Pulando projeto sem ID`);
        continue;
      }
      
      if (evandroIds.has(projectId)) {
        console.log(`⏭️  ${projectId} já existe em Evandro`);
        continue;
      }
      
      console.log(`➕ Adicionando ${projectId} em Evandro...`);
      
      // Criar dados para Evandro (apenas campos em comum)
      const evandroProject: Record<string, any> = {};
      
      for (const header of evandroHeaders) {
        if (header === '.') {
          // Mapear Nº para .
          evandroProject[header] = project['Nº'] || '';
        } else if (COMMON_FIELDS.includes(header)) {
          evandroProject[header] = project[header] || '';
        } else {
          evandroProject[header] = ''; // Campos exclusivos vazios
        }
      }
      
      console.log(`   Dados:`, evandroProject);
      
      const success = await sheetsService.addRow(
        SPREADSHEET_ID,
        EVANDRO_SHEET,
        evandroProject,
        evandroHeaders
      );
      
      if (success) {
        copiados++;
        console.log(`   ✅ ${projectId} copiado com sucesso\n`);
      } else {
        console.log(`   ❌ Erro ao copiar ${projectId}\n`);
      }
    }
    
    console.log(`\n✅ Processo concluído!`);
    console.log(`📊 Total copiado: ${copiados} projetos`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

copiarProjetos();

