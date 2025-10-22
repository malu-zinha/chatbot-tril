import streamlit as st
import pandas as pd
import psycopg2
import json
import os
from datetime import datetime

# --- 1. Importações de Serviços (LLM e Mocks) ---
# Agora usando services.py em vez de services_openai.py
try:
    from services import (
        transcrever_audio,
        analisar_transcricao_llm,
        get_mock_transcription,
    )
except ImportError as e:
    st.error(f"Erro ao importar serviços: {e}. Certifique-se de que 'services.py' está no mesmo diretório.")
    st.stop()


# --- 2. Configuração e Funções de Banco de Dados ---
# ATENÇÃO: Configure suas credenciais reais do PostgreSQL
DB_CONFIG = "dbname=projetos_db user=maluuchoac password=001994 host=localhost"

def get_db_connection():
    """Estabelece e retorna a conexão com o PostgreSQL."""
    try:
        conn = psycopg2.connect(DB_CONFIG)
        return conn
    except Exception as e:
        st.error(f"ERRO DE CONEXÃO COM O BD: {e}")
        st.stop()
        
def load_data(table_name="obras"):
    """Carrega dados das obras e seus responsáveis para exibição."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query para a tabela Obras e Engenheiros (para ver o responsável)
        query = """
        SELECT 
            o.nome_obra, 
            o.status, 
            e.nome as engenheiro_responsavel
        FROM obras o
        JOIN engenheiros e ON o.engenheiro_id = e.id;
        """
        cur.execute(query)
        
        data = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        
        df = pd.DataFrame(data, columns=cols)
        return df

    except Exception as e:
        # st.error(f"Erro ao consultar o banco de dados. Verifique o esquema das tabelas: {e}")
        return pd.DataFrame() 

    finally:
        if conn:
            conn.close()

# --- 3. Lógica de Processamento de Engenheiro (Adaptada do app.py) ---
def processar_atualizacao_engenheiro(conn, cur, eng_id: int, eng_nome: str, transcricao: str, audio_url: str) -> str:
    """Processa a atualização de status de obra por um engenheiro usando o LLM."""
    
    # 1. Busca as obras do engenheiro (permissão e contexto)
    cur.execute("SELECT nome_obra FROM obras WHERE engenheiro_id = %s", (eng_id,))
    obras_engenheiro = [row[0] for row in cur.fetchall()]

    if not obras_engenheiro:
        return f"ATENÇÃO, {eng_nome}. Você não está associado a nenhuma obra para atualização."
        
    # 2. Análise da Transcrição pelo LLM
    # A Intenção é "atualizacao"
    llm_result = analisar_transcricao_llm(transcricao, obras_engenheiro, "atualizacao")

    # Mapeamento dos resultados
    sucesso = llm_result.get('sucesso', False)
    obra_nome = llm_result.get('obra_nome', 'N/A')
    novo_status = llm_result.get('novo_status', 'N/A')
    descricao = llm_result.get('descricao', novo_status)
    
    st.json({"LLM Extração": llm_result})

    if not sucesso or obra_nome == 'N/A' or novo_status == 'N/A':
        return f"Olá, {eng_nome}. Não consegui identificar a obra ou o status. JSON: {llm_result}"

    # 3. Validação final
    if obra_nome not in obras_engenheiro:
        return f"ATENÇÃO, {eng_nome}. A obra '{obra_nome}' não está na sua lista de permissões."

    # 4. Gravação no BD
    try:
        cur.execute("SELECT id FROM obras WHERE nome_obra = %s", (obra_nome,))
        obra_id = cur.fetchone()[0]

        # Atualiza o status
        cur.execute("UPDATE obras SET status = %s WHERE id = %s", 
                    (novo_status, obra_id))
        
        # Insere o log da atualização
        cur.execute("""
            INSERT INTO atualizacoes_obra (obra_id, engenheiro_id, transcricao_texto, link_audio_original)
            VALUES (%s, %s, %s, %s)
        """, (obra_id, eng_id, transcricao, audio_url))
        
        conn.commit()
        return f"✅ SUCESSO! Obra '{obra_nome}' atualizada para Status: **{novo_status}**."

    except Exception as e:
        conn.rollback()
        st.error(f"Erro ao salvar no BD: {e}")
        return f"Houve um erro interno ao salvar sua atualização. Tente novamente."


# --- 4. Lógica de Processamento de CEO (Adaptada do app.py) ---
def processar_consulta_ceo(conn, cur, nome_ceo: str, transcricao: str) -> str:
    """Processa a solicitação de consulta do CEO."""
    
    # 1. Simula a classificação do LLM para a consulta
    llm_result = analisar_transcricao_llm(transcricao, [], "consulta_ceo")

    tipo_consulta = llm_result.get("tipo_consulta")
    obra_nome_pesquisa = llm_result.get("obra_nome")
    
    st.json({"LLM Classificação": llm_result})

    # 2. Executa a consulta no BD
    if tipo_consulta == "geral":
        cur.execute("SELECT nome_obra, status, engenheiros.nome FROM obras JOIN engenheiros ON obras.engenheiro_id = engenheiros.id")
        obras = cur.fetchall()
        
        resumo = f"Olá, {nome_ceo}. O status atual das obras é:\n"
        for nome, status, eng_nome in obras:
            resumo += f"- **{nome}**: Status: {status} (Eng.: {eng_nome})\n"
        return resumo
        
    elif tipo_consulta == "especifica" and obra_nome_pesquisa != 'N/A':
        # Consulta a última atualização (mais detalhada)
        cur.execute("""
            SELECT 
                o.nome_obra, a.transcricao_texto, a.data_atualizacao 
            FROM atualizacoes_obra a
            JOIN obras o ON a.obra_id = o.id
            WHERE o.nome_obra ILIKE %s 
            ORDER BY a.data_atualizacao DESC LIMIT 1
        """, (f'%{obra_nome_pesquisa}%',))
        
        ultima_att = cur.fetchone()
        if ultima_att:
            data_formatada = ultima_att[2].strftime('%d/%m/%Y %H:%M')
            return f"Última atualização da obra '{ultima_att[0]}' ({data_formatada}): '{ultima_att[1]}'"
        else:
            return f"Não encontrei atualizações recentes para a obra '{obra_nome_pesquisa}'."

    return "Não foi possível entender sua consulta ou a obra especificada."


# ==============================================================================
# --- INTERFACE STREAMLIT ---
# ==============================================================================

def main():
    st.set_page_config(layout="wide", page_title="Monitoramento de Obras por Áudio")
    st.title("🚧 Monitoramento de Obras - Simulação Chatbot")
    st.markdown("Interface para **testar e monitorar** as atualizações do banco de dados via LLM.")

    # --- VISUALIZAÇÃO DA TABELA ---
    st.header("Status Atual das Obras")
    placeholder_df = st.empty()
    placeholder_df.dataframe(load_data(), use_container_width=True, hide_index=True)


    # --- SIMULAÇÃO DE INTERAÇÃO ---
    st.header("Simulação de Interação por Áudio")

    col1, col2 = st.columns([1, 2])

    with col1:
        # 1. Seleção do Usuário
        simulated_number = st.selectbox(
            "Selecione o Usuário que está enviando o Áudio:",
            options=[
                '5511987654321 (Engenheiro Alpha)',
                '5511912345678 (Engenheiro Beta)',
                '5511999999999 (CEO Max)'
            ]
        )
        from_number = simulated_number.split(' ')[0]
        
        # Mock de Áudio
        mock_audio_url = f"https://mock.whatsapp.com/audio/{from_number}"
        mocked_transcription = get_mock_transcription(mock_audio_url)
        st.info(f"**O que o Whisper Ouviria:** `{mocked_transcription}`")

    with col2:
        # Ação
        st.markdown("### Resultado da Ação:")
        action = st.button("▶️ SIMULAR ENVIO E ATUALIZAR BD", type="primary")

    if action:
        # --- Lógica de Webhook Simulado ---
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Identificação do Usuário
        cur.execute("SELECT id, nome, eh_ceo FROM engenheiros WHERE whatsapp_numero = %s", (from_number,))
        usuario = cur.fetchone()
        
        if not usuario:
            st.error("Usuário não encontrado no BD. Verifique se o número está cadastrado na tabela `engenheiros`.")
            conn.close()
            return
        
        user_id, user_nome, eh_ceo = usuario
        st.success(f"Usuário identificado: {user_nome} ({'CEO' if eh_ceo else 'Engenheiro'})")

        # 2. Transcrição (Mockada ou Real)
        # Transcricao REAL é feita dentro da função, mas aqui usamos a mockada
        transcricao = transcrever_audio(mock_audio_url) 
        
        if "Erro" in transcricao:
            st.error("Erro na Transcrição. Cheque os logs.")
            conn.close()
            return

        # 3. Roteamento de Lógica
        with st.spinner("Processando LLM e BD..."):
            
            if eh_ceo:
                resposta = processar_consulta_ceo(conn, cur, user_nome, transcricao)
                st.info(f"Resposta do Bot para o CEO:\n\n{resposta}")
                
            else:
                resposta = processar_atualizacao_engenheiro(conn, cur, user_id, user_nome, transcricao, mock_audio_url)
                
                if resposta.startswith("✅"):
                    st.success(resposta)
                else:
                    st.warning(resposta)

        # 4. Fechamento e Recarregamento da Tabela
        cur.close()
        conn.close()
        
        st.toast("Atualização concluída!", icon='🎉')
        
        # Recarrega o dataframe para refletir a mudança
        placeholder_df.dataframe(load_data(), use_container_width=True, hide_index=True)


if __name__ == '__main__':
    main()