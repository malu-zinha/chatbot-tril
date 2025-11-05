import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import { ProjetoService } from '../services/projetoService';
import { ObraModel } from '../models/obra';
import OpenAI from 'openai';

const client = new Client({});

// Configuração da OpenAI
const openai = new OpenAI({
  apiKey: "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"
});

// Estados dos usuários
const userStates = new Map<string, any>();

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para interpretar a intenção do usuário usando OpenAI
async function interpretarMensagem(mensagem: string): Promise<any> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Você é um assistente para um sistema de obras. Sua tarefa é interpretar mensagens e retornar JSON no formato:
          {
            "intent": "view" | "edit" | "list_obras" | "list_areas" | "confirm" | "cancel" | "other",
            "confidence": "high" | "medium" | "low",
            "obra": "<nome da obra ou null>",
            "area": "<Elétrico|Hidrossanitário|Climatização|Drenagem|Solar|null>",
            "fields": [ {"name":"campo","value":"valor"} ],
            "field_to_edit": { "name": "campo", "new_value": "valor" } | null,
            "clarify": true | false,
            "clarify_text": "<texto de clarificação se necessário>"
          }

          Regras:
          - "view": quando usuário quer ver/consultar/verificar dados
          - "edit": quando usuário quer alterar/atualizar/modificar dados
          - Use "confidence": "low" se não tiver certeza sobre obra ou área
          - Para edições, extraia campos e valores da mensagem
          - Peça clarificação quando informações estiverem faltando`
        },
        {
          role: "user",
          content: mensagem
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('Resposta vazia da OpenAI');

    return JSON.parse(response);
  } catch (error) {
    console.error('Erro na interpretação OpenAI:', error);
    // Fallback para interpretação básica
    return {
      intent: "other",
      confidence: "low",
      obra: null,
      area: null,
      fields: [],
      field_to_edit: null,
      clarify: true,
      clarify_text: "Não entendi sua solicitação. Pode reformular?"
    };
  }
}

// Função para mapear área por sinônimos
function mapearArea(area: string): string | null {
  const areas: { [key: string]: string } = {
    'elétrico': 'Elétrico',
    'elétrica': 'Elétrico',
    'eletrico': 'Elétrico',
    'eletrica': 'Elétrico',
    'hidrossanitário': 'Hidrossanitário',
    'hidrossanitario': 'Hidrossanitário',
    'hidráulico': 'Hidrossanitário',
    'hidraulico': 'Hidrossanitário',
    'climatização': 'Climatização',
    'climatizacao': 'Climatização',
    'ar condicionado': 'Climatização',
    'drenagem': 'Drenagem',
    'solar': 'Solar',
    'energia solar': 'Solar'
  };

  return areas[area.toLowerCase()] || null;
}

// Função para processar a interpretação e executar ações
async function processarInterpretacao(interpretacao: any, userId: string, msg: any) {
  const chat = await msg.getChat();
  
  // Se precisa de clarificação
  if (interpretacao.clarify) {
    await client.sendMessage(msg.from, interpretacao.clarify_text);
    return;
  }

  // Buscar obra pelo nome
  let obra = null;
  if (interpretacao.obra) {
    const obras = await ObraModel.listarTodas();
    obra = obras.find(o => 
      o.nome.toLowerCase().includes(interpretacao.obra.toLowerCase()) ||
      interpretacao.obra.toLowerCase().includes(o.nome.toLowerCase())
    );
  }

  // Mapear área
  const area = interpretacao.area ? mapearArea(interpretacao.area) : null;

  // VIEW - Consultar dados
  if (interpretacao.intent === 'view') {
    if (!obra || !area) {
      await client.sendMessage(
        msg.from, 
        'Preciso saber qual obra e área você quer consultar. Ex: "Mostre os dados elétricos da obra Jardins"'
      );
      return;
    }

    let projeto = await ProjetoService.buscarProjeto(obra.id, area);
    if (!projeto) {
      projeto = await ProjetoService.criarProjeto(obra.id, area);
    }

    const contact = await msg.getContact();
    await ProjetoService.visualizarProjeto(projeto.id, userId, contact.pushname);

    await chat.sendStateTyping();
    await delay(1000);

    if (projeto.dados) {
      const campos = parseDataFields(projeto.dados);
      let mensagem = `📊 *${obra.nome} - ${area}*\n\n`;
      mensagem += campos.map((c: any) => `• ${c.nome}: ${c.valor}`).join('\n') || 'Nenhum dado cadastrado';
      
      await client.sendMessage(msg.from, mensagem);
    } else {
      await client.sendMessage(
        msg.from, 
        `✅ *${obra.nome} - ${area}*\n\nAinda não há dados cadastrados.`
      );
    }
  }

  // EDIT - Editar dados
  else if (interpretacao.intent === 'edit') {
    if (!obra || !area) {
      await client.sendMessage(
        msg.from, 
        'Preciso saber qual obra e área você quer editar. Ex: "Atualizar tubulação para 100m na obra Jardins, área hidrossanitário"'
      );
      return;
    }

    if (interpretacao.fields.length === 0) {
      await client.sendMessage(
        msg.from, 
        'Quais dados você quer atualizar? Ex: "Tubulação: 100m, Válvulas: 5"'
      );
      return;
    }

    let projeto = await ProjetoService.buscarProjeto(obra.id, area);
    if (!projeto) {
      projeto = await ProjetoService.criarProjeto(obra.id, area);
    }

    const contact = await msg.getContact();
    
    // Converter fields para string
    const dadosString = interpretacao.fields.map((f: any) => `${f.name}: ${f.value}`).join(', ');
    await ProjetoService.atualizarDados(projeto.id, dadosString, userId, contact.pushname);

    await client.sendMessage(
      msg.from,
      `✅ Dados atualizados com sucesso!\n\n` +
      `📊 *${obra.nome} - ${area}*\n\n` +
      `${interpretacao.fields.map((f: any) => `• ${f.name}: ${f.value}`).join('\n')}\n\n` +
      `Digite "menu" para voltar.`
    );
  }

  // LIST_OBRAS - Listar obras
  else if (interpretacao.intent === 'list_obras') {
    const obras = await ObraModel.listarTodas();
    let mensagem = `🏗️ *Lista de Obras*\n\n`;
    obras.forEach((obra, index) => {
      mensagem += `${index + 1} - ${obra.nome}\n`;
    });
    await client.sendMessage(msg.from, mensagem);
  }

  // OTHER ou intent não reconhecida
  else {
    await client.sendMessage(
      msg.from,
      'Não entendi o que você quer fazer. Pode ser:\n\n' +
      '• "Ver dados elétricos da obra Jardins"\n' +
      '• "Atualizar tubulação para 100m na obra Central Park"\n' +
      '• "Listar obras disponíveis"\n' +
      '• "Menu" para voltar'
    );
  }
}

// Função para parsear dados em campos (mantida do seu código original)
function parseDataFields(dados: string): Array<{ nome: string; valor: string }> {
  if (!dados || dados.trim() === '') return [];
  
  try {
    const jsonData = JSON.parse(dados);
    return Object.entries(jsonData).map(([nome, valor]) => ({ nome, valor: String(valor) }));
  } catch {
    return dados.split(',').map(campo => {
      const [nome, ...valorParts] = campo.split(':');
      return {
        nome: nome?.trim() || 'Campo',
        valor: valorParts.join(':').trim() || ''
      };
    }).filter(c => c.nome && c.valor);
  }
}

// QR Code para autenticação
client.on('qr', (qr: string) => {
  qrcode.generate(qr, { small: true });
});

// Conexão estabelecida
client.on('ready', () => {
  console.log('✅ WhatsApp conectado!');
});

// Lógica do chatbot atualizada
client.on('message', async (msg) => {
  if (!msg.from.endsWith('@c.us')) return;

  const userId = msg.from;
  const userState = userStates.get(userId) || { step: null };

  try {
    // Menu inicial mantido para compatibilidade
    if (msg.body.match(/(menu|oi|olá|ola|bom dia|boa tarde|boa noite|iniciar|começar)/i)) {
      userStates.set(userId, { step: 'menu' });
      
      const contact = await msg.getContact();
      const name = contact.pushname;

      const obras = await ObraModel.listarTodas();
      
      let mensagem = `Olá ${name}! 👋\n\nSelecione a obra:\n\n`;
      obras.forEach((obra, index) => {
        mensagem += `${index + 1} - ${obra.nome}\n`;
      });

      mensagem += `\nOu digite diretamente o que precisa! Ex:\n"ver dados elétricos da obra ${obras[0]?.nome || 'Jardins'}"`;

      await client.sendMessage(msg.from, mensagem);
      return;
    }

    // Se não está em um estado específico, usar OpenAI para interpretar
    if (!userState.step || userState.step === 'menu') {
      await client.sendMessage(msg.from, "🤖 Analisando sua solicitação...");
      
      const interpretacao = await interpretarMensagem(msg.body);
      await processarInterpretacao(interpretacao, userId, msg);
      
      return;
    }

    // Estados específicos mantidos do código original
    // [Mantém toda a lógica de estados específicos do seu código original aqui...]

  } catch (error: any) {
    console.error('Erro no chatbot:', error);
    await client.sendMessage(msg.from, '❌ Erro ao processar. Digite "menu" para tentar novamente.');
    userStates.delete(userId);
  }
});

export async function startBot() {
  await client.initialize();
}

export { client };