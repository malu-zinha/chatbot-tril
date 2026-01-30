-- Cole este SQL no Supabase para verificar se as tarefas estão salvando

-- Ver últimas 5 tarefas criadas
SELECT 
    task_id,
    codigo_projeto,
    cliente,
    descricao_task,
    status_task,
    created_at
FROM evandro_distribuicao_tasks
ORDER BY created_at DESC
LIMIT 5;

-- Ver se tem problema com as notificações
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'notificacoes_whatsapp'
AND constraint_type = 'FOREIGN KEY';

