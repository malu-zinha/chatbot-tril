import os
import requests 
import json     
import psycopg2
from datetime import datetime
from flask import Flask, request, jsonify
from openai import OpenAI
# Para a função gerar_audio_resposta e enviar_mensagem_whatsapp
# Se estas não estiverem definidas neste arquivo, você precisa
# trazê-las de onde estiverem (vamos supor que estejam mockadas aqui por enquanto)

# --- Configuração Inicial ---

# O cliente busca a chave automaticamente da variável de ambiente OPENAI_API_KEY
# Assumindo que você já rodou: export OPENAI_API_KEY="sua_chave_aqui"
client = OpenAI() 

# --- Variáveis de Prompt ---
# Prompt para extrair a atualização do Engenheiro (força JSON)
SYSTEM_PROMPT_ENGINEER = (
    "Você é um extrator de dados de voz. Sua única função é analisar o texto "
    "e extrair o nome da obra e o novo status da obra. O retorno DEVE ser um "
    "JSON VÁLIDO e NADA MAIS, usando as chaves: 'obra' (string) e 'novo_status' (string)."
)

# Prompt para análise e resumo do CEO
SYSTEM_PROMPT_CEO = (
    "Você é um Assistente de Projetos de Alto Nível. Analise os dados brutos de status de obras "
    "fornecidos pelo usuário (que é o CEO) e forneça um resumo conciso e profissional em Português. "
    "Use o contexto da transcrição para orientar sua resposta, mas cite apenas os dados do BD."
)


app = Flask(__name__)

# --- Configuração do Banco de Dados ---
# ATENÇÃO: Verifique se essa senha e user estão corretos no PostgreSQL
DB_CONFIG = "dbname=projetos_db user=maluuchoac password=001994 host=localhost"

def get_db_connection():
    """Função de conexão com o banco de dados PostgreSQL."""
    conn = psycopg2.connect(DB_CONFIG)
    return conn

# --- FUNÇÕES AUXILIARES (INTEGRAÇÃO WHISPER/GPT) ---

def transcrever_audio(audio_url: str) -> str:
    """Baixa o áudio da URL e usa o OpenAI Whisper para transcrever."""
    
    # [CÓDIGO WHISPER AQUI] - Está correto, sem alterações!
    temp_path = "audio_temp.ogg" 
    
    try:
        response = requests.get(audio_url, stream=True)
        response.raise_for_status() 

        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    except requests.exceptions.RequestException as e:
        print(f"Erro ao baixar áudio: {e}")
        return "Erro de Download"
        
    transcricao_texto = "Erro de Transcrição"
    try:
        with open(temp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language="pt"  
            )
        transcricao_texto = transcription.text
    except Exception as e:
        print(f"Erro na API do Whisper: {e}")

    try:
        os.remove(temp_path)
    except OSError as e:
        print(f"Erro ao deletar arquivo temporário: {e}")
        
    return transcricao_texto


def extrair_dados_llm(transcricao: str, obras_ativas: list[str]) -> dict:
    """Usa GPT-4o para extrair o nome da obra e o status em formato JSON."""

    # [CÓDIGO GPT-4o AQUI] - Está correto, sem alterações!
    obras_contexto = ", ".join(obras_ativas)
    
    prompt_user = (
        f"Obras Ativas que o engenheiro gerencia: {obras_contexto}. "
        f"Transcreva a atualização: '{transcricao}'. "
        f"Extraia APENAS o JSON. Se não houver obra válida, use 'N/A' como nome da obra e 'N/A' como status."
    )
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",  
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_ENGINEER},
                {"role": "user", "content": prompt_user}
            ],
            response_format={"type": "json_object"}
        )
        
        json_str = response.choices[0].message.content
        return json.loads(json_str)
        
    except Exception as e:
        print(f"Erro na API do GPT para extração JSON: {e}")
        return {"obra": "Erro de LLM", "novo_status": "Erro de LLM"}


# --- FUNÇÕES MOCKADAS DE COMUNICAÇÃO (VOCÊ DEVE SUBSTITUIR PELA LÓGICA REAL) ---

# Atenção: Você precisa implementar as funções de verdade (Áreas 3 e 4)
def gerar_audio_resposta(resposta_texto: str) -> str:
    """MOCK: Converte texto em áudio e retorna URL pública."""
    print(f"[MOCK TTS] Gerando áudio para: {resposta_texto[:50]}...")
    # Retorna uma URL de áudio MOCK que o WhatsApp aceita para testes
    return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 

def enviar_mensagem_whatsapp(to_number: str, msg_type: str, content: str):
    """MOCK: Simula o envio de mensagem via API da Meta."""
    if msg_type == 'texto':
        print(f"[MOCK WHATSAPP] Enviando TEXTO para {to_number}: {content[:80]}...")
    elif msg_type == 'audio':
        print(f"[MOCK WHATSAPP] Enviando ÁUDIO para {to_number}: {content}")
    # Aqui vai o código real com requests para a API da Meta


# --- LÓGICA DE NEGÓCIO DETALHADA (CORRIGIDA) ---

def processar_consulta_ceo(cur, transcricao: str, nome_ceo: str) -> str:
    """Processa a solicitação de consulta do CEO usando análise do LLM."""
    
    # 1. Busca todos os dados de obras (para dar contexto completo ao LLM)
    # ATENÇÃO: O nome da tabela deve ser 'obras' (minúsculas)
    cur.execute("SELECT nome_obra, status FROM obras") 
    obras_db = cur.fetchall()

    if not obras_db:
        return f"Olá, {nome_ceo}. Não há obras registradas no sistema."

    # Formata os dados brutos do DB para o LLM
    dados_formatados = "\n".join([f"Obra: {nome}, Status: {status}" for nome, status in obras_db])
    
    # 2. Chamada ao GPT-4o para resumir a consulta
    prompt_user = (
        f"Transcreva a solicitação do CEO: '{transcricao}'. "
        f"Use os seguintes DADOS DO BANCO DE DADOS para criar um resumo profissional e conciso. "
        f"DADOS DO BD:\n{dados_formatados}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_CEO},
                {"role": "user", "content": prompt_user}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Erro na API do GPT para CEO: {e}")
        return f"Desculpe, {nome_ceo}, o assistente não conseguiu processar sua solicitação."


def processar_atualizacao_engenheiro(cur, eng_id: int, eng_nome: str, transcricao: str, audio_url: str) -> str:
    """Processa a atualização de status de obra por um engenheiro, usando análise do LLM."""
    
    # 1. Busca as obras do engenheiro (para permissão e contexto do LLM)
    cur.execute("SELECT nome_obra FROM obras WHERE engenheiro_id = %s", (eng_id,))
    obras_engenheiro = [row[0] for row in cur.fetchall()]

    if not obras_engenheiro:
        return f"ATENÇÃO, {eng_nome}. Você não está associado a nenhuma obra para atualização."
        
    # 2. Análise da Transcrição pelo LLM (Substitui a lógica antiga)
    # CHAMANDO A FUNÇÃO CORRETA extrair_dados_llm
    dados_atualizacao = extrair_dados_llm(transcricao, obras_engenheiro)

    obra_nome = dados_atualizacao.get("obra", "N/A")
    novo_status = dados_atualizacao.get("novo_status", "N/A")
    
    # 3. Validação e Permissão
    if obra_nome == "N/A" or novo_status == "N/A":
        return f"Olá, {eng_nome}. Não consegui identificar a obra ou o novo status. Por favor, diga claramente o nome e o status (ex: 'Torre do Sol, concluído 85%')."

    # Verifica se a obra identificada pelo LLM está na lista de permissão
    if obra_nome not in obras_engenheiro:
        return f"ATENÇÃO, {eng_nome}. A obra '{obra_nome}' não está na sua lista de permissões."

    # 4. Gravação no BD
    try:
        # ATENÇÃO: Nomes de tabelas em minúsculas
        cur.execute("SELECT id FROM obras WHERE nome_obra = %s", (obra_nome,))
        obra_id = cur.fetchone()[0]

        cur.execute("UPDATE obras SET status = %s WHERE id = %s", 
                    (novo_status, obra_id))
        
        # ATENÇÃO: Nomes de tabelas em minúsculas
        cur.execute("""
            INSERT INTO atualizacoes_obra (obra_id, engenheiro_id, transcricao_texto, link_audio_original)
            VALUES (%s, %s, %s, %s)
        """, (obra_id, eng_id, transcricao, audio_url))
        
        return f"Atualização da obra '{obra_nome}' registrada! Novo Status: {novo_status}."

    except Exception as e:
        print(f"Erro ao salvar no BD: {e}")
        return f"Houve um erro interno ao salvar sua atualização. Tente novamente."


# --- Rota Principal (O Webhook Mockado) ---
@app.route('/webhook', methods=['POST'])
def webhook():
    # 1. Recebimento e Validação de Dados
    dados = request.json
    
    # A variável 'text' foi removida, pois estamos focando no áudio
    if 'from_number' not in dados or 'audio_url' not in dados:
         return jsonify({"status": "erro", "mensagem": "Dados de webhook incompletos."}), 400
         
    from_number = dados['from_number']
    audio_url = dados['audio_url']
    
    # 2. Transcrição do Áudio (WHISPER)
    print(f"Processando áudio de: {from_number}")
    transcricao = transcrever_audio(audio_url)
    
    if "Erro" in transcricao:
        enviar_mensagem_whatsapp(from_number, 'texto', "Desculpe, não consegui transcrever seu áudio. Tente novamente.")
        return "", 200

    print(f"Transcrição Whisper: {transcricao}")

    # 3. Processamento e Identificação do Usuário
    conn = get_db_connection()
    cur = conn.cursor()
    
    # ATENÇÃO: Nomes de tabelas em minúsculas
    cur.execute("SELECT id, nome, eh_ceo FROM engenheiros WHERE whatsapp_numero = %s", (from_number,))
    usuario = cur.fetchone()
    
    if not usuario:
        # Se não for um usuário cadastrado
        conn.close()
        enviar_mensagem_whatsapp(from_number, 'texto', "Seu número não está cadastrado. Fale com o administrador.")
        return jsonify({"status": "erro", "mensagem": "Usuário não cadastrado"}), 200

    user_id, user_nome, eh_ceo = usuario

    # 4. Roteamento de Lógica (Engenheiro ou CEO)
    if eh_ceo:
        # Lógica de Consulta do CEO (retorna texto que será transformado em áudio)
        resposta_texto = processar_consulta_ceo(cur, transcricao, user_nome)
        
        # Geração de áudio (TTS) e envio (requer implementação real)
        audio_url_resposta = gerar_audio_resposta(resposta_texto)
        enviar_mensagem_whatsapp(from_number, 'audio', audio_url_resposta)

    else:
        # Lógica de Atualização do Engenheiro (retorna texto)
        resposta_texto = processar_atualizacao_engenheiro(cur, user_id, user_nome, transcricao, audio_url)
        
        # Envio de mensagem de confirmação em texto
        enviar_mensagem_whatsapp(from_number, 'texto', resposta_texto)
    
    # 5. Fechamento da Transação
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({"status": "ok", "mensagem": "Mensagem processada"}), 200


if __name__ == '__main__':
    print("Servidor Flask rodando em http://localhost:8000/webhook")
    # ATENÇÃO: Certifique-se de que o Postgres está rodando e a chave OpenAI está exportada!
    app.run(debug=True, port=8000)