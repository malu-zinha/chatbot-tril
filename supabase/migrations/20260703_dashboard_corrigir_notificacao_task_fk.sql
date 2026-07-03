-- =====================================================
-- MIGRACAO: Corrige FK de notificacao ao atribuir projeto
-- =====================================================
-- A sincronizacao da task precisa rodar antes do INSERT para preencher
-- NEW.eng_projeto_id. A notificacao precisa rodar depois do INSERT, pois
-- notificacoes_whatsapp.task_id referencia evandro_distribuicao_tasks.task_id.
-- =====================================================

DROP TRIGGER IF EXISTS trg_sincronizar_task ON evandro_distribuicao_tasks;
DROP TRIGGER IF EXISTS trg_notificar_task ON evandro_distribuicao_tasks;
DROP FUNCTION IF EXISTS notificar_task_criada();

CREATE OR REPLACE FUNCTION sincronizar_task_para_engenheiro()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
    v_eng_projeto_id UUID;
    v_status_id INTEGER;
BEGIN
    IF NEW.sincronizado = false THEN
        IF NEW.projeto_id IS NULL AND NEW.codigo_projeto IS NOT NULL THEN
            INSERT INTO projetos (codigo_projeto, cliente)
            VALUES (NEW.codigo_projeto, NEW.cliente)
            ON CONFLICT (codigo_projeto) DO NOTHING
            RETURNING projeto_id INTO v_projeto_id;

            IF v_projeto_id IS NULL THEN
                SELECT projeto_id INTO v_projeto_id
                FROM projetos
                WHERE codigo_projeto = NEW.codigo_projeto
                LIMIT 1;
            END IF;

            NEW.projeto_id := v_projeto_id;
        ELSE
            v_projeto_id := NEW.projeto_id;
        END IF;

        SELECT status_id INTO v_status_id
        FROM status_codes
        WHERE codigo = 'AGUARDANDO_INICIO'
        LIMIT 1;

        INSERT INTO engenheiros_projetos (
            eng_id,
            projeto_id,
            area_id,
            instancia_label,
            data_inicio,
            data_prevista,
            status_id,
            observacoes
        ) VALUES (
            NEW.eng_id,
            v_projeto_id,
            NEW.area_id,
            NEW.instancia_label,
            COALESCE(NEW.data_inicio_prevista, CURRENT_DATE),
            NEW.data_conclusao_prevista,
            v_status_id,
            'Atribuido por: ' || COALESCE(
                (SELECT nome FROM dono_empresa WHERE dono_id = NEW.dono_id),
                'Sistema'
            )
        ) RETURNING id, instancia_label INTO v_eng_projeto_id, NEW.instancia_label;

        NEW.eng_projeto_id := v_eng_projeto_id;
        NEW.sincronizado := true;
        NEW.data_sincronizacao := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notificar_task_criada()
RETURNS TRIGGER AS $$
DECLARE
    v_telefone TEXT;
    v_codigo_projeto TEXT;
    v_area_label TEXT;
BEGIN
    IF NEW.sincronizado = true THEN
        SELECT telefone INTO v_telefone
        FROM engenheiros
        WHERE eng_id = NEW.eng_id;

        SELECT codigo_projeto INTO v_codigo_projeto
        FROM projetos
        WHERE projeto_id = NEW.projeto_id;

        SELECT COALESCE(NEW.instancia_label, a.descricao) INTO v_area_label
        FROM areas a
        WHERE a.area_id = NEW.area_id;

        INSERT INTO notificacoes_whatsapp (
            eng_id,
            telefone,
            tipo,
            titulo,
            mensagem,
            task_id,
            projeto_id
        ) VALUES (
            NEW.eng_id,
            v_telefone,
            'NOVA_TAREFA',
            'Nova Tarefa Atribuida!',
            'Projeto: ' || COALESCE(NEW.codigo_projeto, v_codigo_projeto, 'N/A') ||
            E'\nArea: ' || COALESCE(v_area_label, 'Nao definido') ||
            E'\nDescricao: ' || NEW.descricao_task ||
            E'\nInicio previsto: ' || COALESCE(NEW.data_inicio_prevista::TEXT, 'Nao definido') ||
            E'\nConclusao prevista: ' || COALESCE(NEW.data_conclusao_prevista::TEXT, 'Nao definido'),
            NEW.task_id,
            NEW.projeto_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincronizar_task
    BEFORE INSERT ON evandro_distribuicao_tasks
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_task_para_engenheiro();

CREATE TRIGGER trg_notificar_task
    AFTER INSERT ON evandro_distribuicao_tasks
    FOR EACH ROW
    EXECUTE FUNCTION notificar_task_criada();

COMMENT ON FUNCTION sincronizar_task_para_engenheiro IS
'Sincroniza tasks com engenheiros_projetos antes do insert, sem criar notificacao.';

COMMENT ON FUNCTION notificar_task_criada IS
'Cria notificacao WhatsApp depois que evandro_distribuicao_tasks.task_id existe.';
