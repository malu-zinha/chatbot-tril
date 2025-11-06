import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import { ProjetoService } from '../services/projetoService.ts';
import { ObraModel } from '../models/obra.ts';
import OpenAI from 'openai';

const client = new Client({});

// Configuração da OpenAI
const openai = new OpenAI({
  apiKey: "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"
});

// Estados dos usuários com contexto
interface UserState {
  step: 'menu' | 'asking_obra' | 'asking_area' | 'asking_field' | 'confirming' | null;
  obraId?: string;
  obraNome?: string;
  areaNome?: string;
  projetoId?: string;
  dadosAtuais?: string;
  campos?: Array<{ nome: string; valor: string }>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const userStates = new Map<string, UserState>();

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar para detectar obra por número ou nome (fallback)
function detectarObraFallback(mensagem: string, obras: any[]): any {
  // Tentar por número
  const numeroMatch = mensagem.match(/\b(\d+)\b/);
  if (numeroMatch) {
    const numero = parseInt(numeroMatch[1]);
    if (numero > 0 && numero <= obras.length) {
      return obras[numero - 1];
    }
  }
  
  // Tentar por nome (busca parcial)
  const mensagemLower = mensagem.toLowerCase();
  for (const obra of obras) {
    const obraLower = obra.nome.toLowerCase();
    if (mensagemLower.includes(obraLower) || obraLower.includes(mensagemLower)) {
      return obra;
    }
  }
  
  return null;
}

// Função auxiliar para detectar área (fallback)
function detectarAreaFallback(mensagem: string): string | null {
  const mensagemLower = mensagem.toLowerCase();
  const areas: { [key: string]: string } = {
    '1': 'Elétrico',
    '2': 'Hidrossanitário',
    '3': 'Climatização',
    '4': 'Drenagem',
    '5': 'Solar',
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
  
  for (const [key, value] of Object.entries(areas)) {
    if (mensagemLower.includes(key)) {
      return value;
    }
  }
  
  return null;
}

// Função para interpretar mensagem com contexto
async function interpretarMensagem(mensagem: string, userState: UserState, obras: any[]): Promise<any> {
  try {
    // FALLBACK: Se o usuário está respondendo a uma pergunta específica, tentar detectar diretamente
    if (userState.step === 'asking_obra') {
      const obraDetectada = detectarObraFallback(mensagem, obras);
      if (obraDetectada) {
        return {
          intent: "ask_area",
          confidence: "high",
          obra: obraDetectada.nome,
          area: null,
          fields: [],
          field_to_edit: null,
          response_text: `Ótimo! Você escolheu a obra *${obraDetectada.nome}*.\n\nQual área você quer trabalhar?\n\n• Elétrico\n• Hidrossanitário\n• Climatização\n• Drenagem\n• Solar`,
          needs_clarification: false
        };
      }
    }
    
    if (userState.step === 'asking_area') {
      const areaDetectada = detectarAreaFallback(mensagem);
      if (areaDetectada && userState.obraId) {
        return {
          intent: "ask_field",
          confidence: "high",
          obra: userState.obraNome || null,
          area: areaDetectada,
          fields: [],
          field_to_edit: null,
          response_text: "",
          needs_clarification: false
        };
      }
    }

    // Construir histórico de conversa
    const messages: any[] = [
      {
        role: "system",
        content: `Você é um assistente inteligente para um sistema de gestão de obras. 

CONTEXTO CRÍTICO - VOCÊ ESTÁ PERGUNTANDO:
${userState.step === 'asking_obra' ? `Você acabou de perguntar: "Qual obra você gostaria de trabalhar?" com as opções: ${obras.map((o, i) => `${i + 1}. ${o.nome}`).join(', ')}. O usuário está RESPONDENDO essa pergunta. Se ele digitar um número (1, 2, etc), é o número da obra. Se digitar o nome da obra ou parte dele, é a obra correspondente.` : ''}
${userState.step === 'asking_area' ? `Você acabou de perguntar: "Qual área você quer trabalhar?" para a obra ${userState.obraNome}. O usuário está RESPONDENDO essa pergunta. Áreas válidas: Elétrico, Hidrossanitário, Climatização, Drenagem, Solar.` : ''}
${userState.step === 'asking_field' ? `Você acabou de mostrar os dados da obra ${userState.obraNome} - ${userState.areaNome} e perguntou o que o usuário quer fazer. O usuário está RESPONDENDO.

IMPORTANTE: Se o usuário mencionar campos e valores (ex: "data de início como 25 de julho", "adicionar tubulação 100m", "quero cadastrar válvulas: 5"), você DEVE extrair esses dados no campo "fields" mesmo que o intent não seja "edit". Exemplos de mensagens que devem ser interpretadas como cadastro:
- "eu quero adicionar a data de início como 25 de julho" → fields: [{"name": "data de início", "value": "25 de julho"}]
- "cadastrar tubulação: 100m" → fields: [{"name": "tubulação", "value": "100m"}]
- "quero adicionar válvulas 5" → fields: [{"name": "válvulas", "value": "5"}]
Use intent: "edit" quando detectar campos e valores na mensagem.` : ''}

OBRAS DISPONÍVEIS: ${obras.map((o, i) => `${i + 1}. ${o.nome}`).join(', ')}

ÁREAS DISPONÍVEIS: Elétrico, Hidrossanitário, Climatização, Drenagem, Solar

Retorne APENAS um JSON válido (sem texto adicional antes ou depois):
{
  "intent": "ask_area" | "ask_field" | "view" | "edit" | "list_obras" | "other",
  "confidence": "high" | "medium" | "low",
  "obra": "${userState.step === 'asking_obra' ? 'extraia o nome da obra da mensagem do usuário' : (userState.obraNome || 'null')}",
  "area": "${userState.step === 'asking_area' ? 'extraia a área da mensagem (Elétrico, Hidrossanitário, Climatização, Drenagem ou Solar)' : (userState.areaNome || 'null')}",
  "fields": [],
  "field_to_edit": null,
  "response_text": "${userState.step === 'asking_obra' ? 'mensagem confirmando a obra escolhida' : (userState.step === 'asking_area' ? 'mensagem confirmando a área escolhida' : 'mensagem apropriada')}",
  "needs_clarification": false
}

REGRAS CRÍTICAS:
1. Se está em asking_obra e o usuário digita "1", "2", etc, extraia o número e identifique a obra correspondente
2. Se está em asking_obra e o usuário digita o nome da obra (ou parte), identifique a obra
3. Se está em asking_area e o usuário digita "elétrico", "hidrossanitário", etc, identifique a área
4. NUNCA retorne needs_clarification: true se o usuário está claramente respondendo sua pergunta
5. Seja DIRETO e PRECISO - não peça clarificação se a resposta é óbvia`
      }
    ];

    // Adicionar histórico de conversa se existir
    if (userState.conversationHistory) {
      messages.push(...userState.conversationHistory.slice(-4)); // Últimas 4 mensagens
    }

    messages.push({
      role: "user",
      content: mensagem
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.1, // Reduzido para ser mais determinístico
      max_tokens: 400
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('Resposta vazia da OpenAI');

    // Tentar parsear JSON diretamente
    let resultado;
    try {
      resultado = JSON.parse(response);
    } catch {
      // Se falhar, tentar extrair JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    }

    // FALLBACK FINAL: Se ainda não identificou obra/área mas está no contexto certo, tentar detectar
    if (userState.step === 'asking_obra' && !resultado.obra) {
      const obraDetectada = detectarObraFallback(mensagem, obras);
      if (obraDetectada) {
        resultado.obra = obraDetectada.nome;
        resultado.intent = "ask_area";
        resultado.confidence = "high";
        resultado.needs_clarification = false;
        resultado.response_text = `Ótimo! Você escolheu a obra *${obraDetectada.nome}*.\n\nQual área você quer trabalhar?\n\n• Elétrico\n• Hidrossanitário\n• Climatização\n• Drenagem\n• Solar`;
      }
    }

    if (userState.step === 'asking_area' && !resultado.area) {
      const areaDetectada = detectarAreaFallback(mensagem);
      if (areaDetectada) {
        resultado.area = areaDetectada;
        resultado.intent = "ask_field";
        resultado.confidence = "high";
        resultado.needs_clarification = false;
      }
    }

    return resultado;
  } catch (error) {
    console.error('Erro na interpretação OpenAI:', error);
    
    // FALLBACK AGressivo: tentar detectar mesmo com erro
    if (userState.step === 'asking_obra') {
      const obraDetectada = detectarObraFallback(mensagem, obras);
      if (obraDetectada) {
        return {
          intent: "ask_area",
          confidence: "high",
          obra: obraDetectada.nome,
          area: null,
          fields: [],
          field_to_edit: null,
          response_text: `Ótimo! Você escolheu a obra *${obraDetectada.nome}*.\n\nQual área você quer trabalhar?\n\n• Elétrico\n• Hidrossanitário\n• Climatização\n• Drenagem\n• Solar`,
          needs_clarification: false
        };
      }
    }
    
    if (userState.step === 'asking_area') {
      const areaDetectada = detectarAreaFallback(mensagem);
      if (areaDetectada) {
        return {
          intent: "ask_field",
          confidence: "high",
          obra: userState.obraNome || null,
          area: areaDetectada,
          fields: [],
          field_to_edit: null,
          response_text: "",
          needs_clarification: false
        };
      }
    }
    
    return {
      intent: "other",
      confidence: "low",
      obra: null,
      area: null,
      fields: [],
      field_to_edit: null,
      response_text: "Desculpe, não entendi. Pode reformular?",
      needs_clarification: true
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

// Função auxiliar para atualizar histórico de conversa
function atualizarHistorico(userState: UserState, role: 'user' | 'assistant', content: string) {
  if (!userState.conversationHistory) {
    userState.conversationHistory = [];
  }
  userState.conversationHistory.push({ role, content });
  // Manter apenas últimas 10 mensagens
  if (userState.conversationHistory.length > 10) {
    userState.conversationHistory = userState.conversationHistory.slice(-10);
  }
}

// Função para processar a interpretação com fluxo conversacional
async function processarInterpretacao(interpretacao: any, userId: string, msg: any, userState: UserState) {
  const chat = await msg.getChat();
  const obras = await ObraModel.listarTodas();

  // Atualizar histórico com mensagem do usuário
  atualizarHistorico(userState, 'user', msg.body);

  // Se precisa de clarificação
  if (interpretacao.needs_clarification) {
    const resposta = interpretacao.response_text || "Não entendi. Pode reformular?";
    await client.sendMessage(msg.from, resposta);
    atualizarHistorico(userState, 'assistant', resposta);
    return;
  }

  // Buscar obra pelo nome
  let obra = null;
  if (interpretacao.obra) {
    obra = obras.find(o => 
      o.nome.toLowerCase().includes(interpretacao.obra.toLowerCase()) ||
      interpretacao.obra.toLowerCase().includes(o.nome.toLowerCase())
    );
  }

  // Mapear área
  const area = interpretacao.area ? mapearArea(interpretacao.area) : null;

  // FLUXO: ASK_OBRA - Perguntar qual obra
  if (interpretacao.intent === 'ask_obra' || (userState.step === 'menu' && !obra)) {
    userState.step = 'asking_obra';
    const resposta = interpretacao.response_text || `Qual obra você gostaria de trabalhar?\n\nObras disponíveis:\n${obras.map((o, i) => `${i + 1}. ${o.nome}`).join('\n')}`;
    await client.sendMessage(msg.from, resposta);
    atualizarHistorico(userState, 'assistant', resposta);
    userStates.set(userId, userState);
    return;
  }

  // FLUXO: Identificar obra e perguntar área (se ainda não tem área)
  if (userState.step === 'asking_obra' && obra && !area) {
    userState.step = 'asking_area';
    userState.obraId = obra.id;
    userState.obraNome = obra.nome;
    
    const resposta = interpretacao.response_text || `Ótimo! Você escolheu a obra *${obra.nome}*.\n\nQual área você quer trabalhar?\n\n• Elétrico\n• Hidrossanitário\n• Climatização\n• Drenagem\n• Solar`;
    await client.sendMessage(msg.from, resposta);
    atualizarHistorico(userState, 'assistant', resposta);
    userStates.set(userId, userState);
    return;
  }

  // FLUXO: Se já tem obra no estado mas não tem área, e agora identificou obra
  if (userState.step === 'asking_area' && !userState.obraId && obra) {
    userState.obraId = obra.id;
    userState.obraNome = obra.nome;
  }

  // FLUXO: Identificar área e mostrar dados / perguntar campo
  if ((interpretacao.intent === 'ask_field' || userState.step === 'asking_area') && userState.obraId && area) {
    const obraAtual = obras.find(o => o.id === userState.obraId);
    if (!obraAtual) return;
    userState.step = 'asking_field';
    userState.areaNome = area;
    
    let projeto = await ProjetoService.buscarProjeto(obraAtual.id, area);
    if (!projeto) {
      projeto = await ProjetoService.criarProjeto(obraAtual.id, area);
    }
    
    userState.projetoId = projeto.id;

    const contact = await msg.getContact();
    await ProjetoService.visualizarProjeto(projeto.id, userId, contact.pushname);

    await chat.sendStateTyping();
    await delay(1000);

    // Buscar dados atualizados do banco (sempre buscar do banco, não confiar no estado)
    const projetoAtualizado = await ProjetoService.buscarProjeto(obraAtual.id, area);
    if (projetoAtualizado) {
      userState.projetoId = projetoAtualizado.id;
      userState.dadosAtuais = projetoAtualizado.dados || '';
      userState.campos = projetoAtualizado.dados ? parseDataFields(projetoAtualizado.dados) : [];
    }

    if (projetoAtualizado?.dados && projetoAtualizado.dados.trim() !== '') {
      const campos = userState.campos || [];

      let mensagem = `📊 *${obraAtual.nome} - ${area}*\n\n`;
      mensagem += campos.map((c: any, i: number) => `${i + 1}. ${c.nome}: ${c.valor}`).join('\n');
      mensagem += `\n\nO que você gostaria de fazer?\n• Ver algum campo específico\n• Alterar algum valor\n• Adicionar novo campo\n\nPode me dizer em linguagem natural!`;

      await client.sendMessage(msg.from, mensagem);
      atualizarHistorico(userState, 'assistant', mensagem);
    } else {
      const mensagem = `✅ *${obraAtual.nome} - ${area}*\n\nAinda não há dados cadastrados.\n\nO que você gostaria de cadastrar? Pode me dizer em linguagem natural (ex: "Tubulação: 100m, Válvulas: 5")`;
      await client.sendMessage(msg.from, mensagem);
      atualizarHistorico(userState, 'assistant', mensagem);
    }
    
    userStates.set(userId, userState);
    return;
  }

  // FLUXO: Processar edição/visualização quando já tem obra e área
  if (userState.step === 'asking_field' && userState.obraId && userState.areaNome) {
    const obra = obras.find(o => o.id === userState.obraId);
    if (!obra) return;

    // Garantir que projeto existe
    if (!userState.projetoId) {
      let projeto = await ProjetoService.buscarProjeto(userState.obraId, userState.areaNome);
      if (!projeto) {
        projeto = await ProjetoService.criarProjeto(userState.obraId, userState.areaNome);
      }
      userState.projetoId = projeto.id;
      userState.dadosAtuais = projeto.dados || '';
      userState.campos = projeto.dados ? parseDataFields(projeto.dados) : [];
    }

    // VIEW - Consultar dados
    if (interpretacao.intent === 'view') {
      // Buscar dados atualizados do banco
      const projetoAtualizado = await ProjetoService.buscarProjeto(userState.obraId, userState.areaNome);
      if (projetoAtualizado && projetoAtualizado.dados) {
        userState.campos = parseDataFields(projetoAtualizado.dados);
        userState.dadosAtuais = projetoAtualizado.dados;
        
        const campo = interpretacao.field_to_edit?.name 
          ? userState.campos.find(c => c.nome.toLowerCase().includes(interpretacao.field_to_edit.name.toLowerCase()))
          : null;

        if (campo) {
          const mensagem = `📋 *${campo.nome}*\n\nValor atual: ${campo.valor}`;
          await client.sendMessage(msg.from, mensagem);
          atualizarHistorico(userState, 'assistant', mensagem);
        } else {
          const mensagem = interpretacao.response_text || `📊 *${obra.nome} - ${userState.areaNome}*\n\n${userState.campos.map((c: any) => `• ${c.nome}: ${c.valor}`).join('\n')}`;
          await client.sendMessage(msg.from, mensagem);
          atualizarHistorico(userState, 'assistant', mensagem);
        }
      }
      userStates.set(userId, userState);
      return;
    }

    // EDIT ou CADASTRO - Processar dados (seja edit ou cadastro inicial)
    const temDados = interpretacao.fields && interpretacao.fields.length > 0;
    const mensagemPareceCadastro = msg.body.toLowerCase().match(/(adicionar|adiciona|cadastrar|cadastra|inserir|insere|quero|vou)/i);
    
    if ((interpretacao.intent === 'edit' || mensagemPareceCadastro) && temDados) {
      const contact = await msg.getContact();
      
      // Buscar dados atuais do banco
      const projetoAtual = await ProjetoService.buscarProjeto(userState.obraId, userState.areaNome);
      if (projetoAtual) {
        userState.projetoId = projetoAtual.id;
        userState.dadosAtuais = projetoAtual.dados || '';
        userState.campos = projetoAtual.dados ? parseDataFields(projetoAtual.dados) : [];
      }
      
      // Atualizar dados existentes ou criar novos
      let novosDados = userState.dadosAtuais || '';
      const camposExistentes = userState.campos || [];
      
      interpretacao.fields.forEach((field: any) => {
        const campoExistente = camposExistentes.find((c: any) => 
          c.nome.toLowerCase().includes(field.name.toLowerCase()) ||
          field.name.toLowerCase().includes(c.nome.toLowerCase())
        );

        if (campoExistente) {
          // Atualizar campo existente
          novosDados = novosDados.replace(
            new RegExp(`${campoExistente.nome}:\\s*[^,]+`, 'i'),
            `${campoExistente.nome}: ${field.value}`
          );
        } else {
          // Adicionar novo campo
          novosDados += (novosDados ? ', ' : '') + `${field.name}: ${field.value}`;
        }
      });

      // SALVAR NO BANCO
      await ProjetoService.atualizarDados(userState.projetoId, novosDados, userId, contact.pushname);

      // Buscar dados atualizados do banco para confirmar
      const projetoAtualizado = await ProjetoService.buscarProjeto(userState.obraId, userState.areaNome);
      if (projetoAtualizado) {
        userState.dadosAtuais = projetoAtualizado.dados || '';
        userState.campos = projetoAtualizado.dados ? parseDataFields(projetoAtualizado.dados) : [];
      } else {
        // Fallback: usar dados que acabamos de salvar
        userState.dadosAtuais = novosDados;
        userState.campos = parseDataFields(novosDados);
      }

      // Mostrar confirmação
      const mensagem = `✅ *Dados ${userState.campos.length > camposExistentes.length ? 'cadastrados' : 'atualizados'} com sucesso!*\n\n📊 *${obra.nome} - ${userState.areaNome}*\n\n` +
        userState.campos.map((c: any) => `• ${c.nome}: ${c.valor}`).join('\n') +
        `\n\nDeseja fazer mais alguma alteração? Ou digite "menu" para voltar.`;

      await client.sendMessage(msg.from, mensagem);
      atualizarHistorico(userState, 'assistant', mensagem);
      userStates.set(userId, userState);
      return;
    }

    // Se não entendeu, perguntar novamente
    const resposta = interpretacao.response_text || "Não entendi o que você quer fazer. Pode reformular?";
    await client.sendMessage(msg.from, resposta);
    atualizarHistorico(userState, 'assistant', resposta);
    userStates.set(userId, userState);
    return;
  }

  // LIST_OBRAS
  if (interpretacao.intent === 'list_obras') {
    let mensagem = `🏗️ *Lista de Obras*\n\n`;
    obras.forEach((obra, index) => {
      mensagem += `${index + 1} - ${obra.nome}\n`;
    });
    await client.sendMessage(msg.from, mensagem);
    atualizarHistorico(userState, 'assistant', mensagem);
    userStates.set(userId, userState);
    return;
  }

  // OTHER - resposta do GPT
  const resposta = interpretacao.response_text || "Não entendi. Pode reformular?";
  await client.sendMessage(msg.from, resposta);
  atualizarHistorico(userState, 'assistant', resposta);
  userStates.set(userId, userState);
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

// Lógica do chatbot com fluxo conversacional inteligente
client.on('message', async (msg) => {
  if (!msg.from.endsWith('@c.us')) return;

  const userId = msg.from;
  let userState = userStates.get(userId) || { 
    step: null,
    conversationHistory: []
  };

  try {
    // Menu inicial - resetar estado e começar conversa
    if (msg.body.match(/(menu|oi|olá|ola|bom dia|boa tarde|boa noite|iniciar|começar|reset|voltar)/i)) {
      userState = {
        step: 'menu',
        conversationHistory: []
      };
      userStates.set(userId, userState);
      
      const contact = await msg.getContact();
      const name = contact.pushname;

      const obras = await ObraModel.listarTodas();
      const mensagem = `Olá ${name}! 👋\n\n` +
        `Como posso te ajudar hoje?\n\n` +
        `Você pode trabalhar com obras e projetos. Vou te guiar passo a passo!\n\n` +
        `Qual obra você gostaria de trabalhar?\n\n` +
        `Obras disponíveis:\n${obras.map((o, i) => `${i + 1}. ${o.nome}`).join('\n')}`;

      await client.sendMessage(msg.from, mensagem);
      atualizarHistorico(userState, 'assistant', mensagem);
      userState.step = 'asking_obra';
      userStates.set(userId, userState);
      return;
    }

    // Usar IA para interpretar com contexto
    const obras = await ObraModel.listarTodas();
    
    await client.sendMessage(msg.from, "🤖 Analisando...");
    
    const interpretacao = await interpretarMensagem(msg.body, userState, obras);
    await processarInterpretacao(interpretacao, userId, msg, userState);
    
    // Estado já foi atualizado dentro de processarInterpretacao

  } catch (error: any) {
    console.error('Erro no chatbot:', error);
    await client.sendMessage(msg.from, '❌ Erro ao processar. Digite "menu" para começar novamente.');
    userStates.set(userId, { step: 'menu', conversationHistory: [] });
  }
});

export async function startBot() {
  await client.initialize();
}

export { client };