-- A Conversa do Slack aparece na Althius (slack-canal 06; decisão Q15). As RPCs que listam e abrem as Conversas de quem
-- está na sessão passam a devolver a origem (`althius` ou `slack`), para a tela marcar a do Slack e deixá-la só para
-- leitura. Quem vê continua sendo só o dono: a Conversa do Slack é de quem mencionou.
--
-- Funções compartilhadas redefinidas a partir da definição mais recente da `main`: list_agent_conversations e
-- get_agent_conversation (20260929180000), list_named_agent_conversations (20260930113000). A assinatura de retorno das
-- duas listas muda, então a função antiga sai e esta entra no lugar (mesmo nome, mesmos argumentos, mesmas permissões).

drop function if exists public.list_agent_conversations(uuid);

create function public.list_agent_conversations(p_workspace_id uuid)
returns table (id uuid, kind text, agent_id uuid, updated_at timestamptz, open_run_id uuid, origin text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_user();
begin
  perform private.require_active_membership(p_workspace_id);
  return query
    select c.id, c.kind, c.agent_id, c.updated_at,
      (select r.id from private.agent_runs r where r.conversation_id = c.id and r.status in ('queued', 'running')),
      c.origin
    from private.agent_conversations c
    where c.workspace_id = p_workspace_id and c.owner_id = v_user_id
    order by c.updated_at desc, c.id
    limit 50;
end;
$$;

drop function if exists public.list_named_agent_conversations(uuid);

create function public.list_named_agent_conversations(p_workspace_id uuid)
returns table (
  id uuid,
  kind text,
  agent_id uuid,
  title text,
  first_request text,
  updated_at timestamptz,
  open_run_id uuid,
  origin text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_user();
begin
  perform private.require_active_membership(p_workspace_id);
  return query
    select c.id, c.kind, c.agent_id, c.title,
      (select r.request_text from private.agent_runs r where r.conversation_id = c.id order by r.created_at, r.id limit 1),
      c.updated_at,
      (select r.id from private.agent_runs r where r.conversation_id = c.id and r.status in ('queued', 'running')),
      c.origin
    from private.agent_conversations c
    where c.workspace_id = p_workspace_id and c.owner_id = v_user_id
    order by c.updated_at desc, c.id
    limit 50;
end;
$$;

-- Uma Conversa de quem pede, com a origem, as últimas 20 Execuções em ordem e os eventos de cada uma.
create or replace function public.get_agent_conversation(p_conversation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.require_user();
  v_conversation private.agent_conversations%rowtype;
begin
  select * into v_conversation from private.agent_conversations c
  where c.id = p_conversation_id and c.owner_id = v_user_id;
  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  perform private.require_active_membership(v_conversation.workspace_id);
  return jsonb_build_object(
    'id', v_conversation.id,
    'kind', v_conversation.kind,
    'agent_id', v_conversation.agent_id,
    'origin', v_conversation.origin,
    'runs', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', r.id, 'request_text', r.request_text, 'status', r.status, 'error_code', r.error_code,
          'created_at', r.created_at, 'events', private.run_events_json(r.id, 0)
        ) order by r.created_at, r.id)
      from (
        select * from private.agent_runs r
        where r.conversation_id = p_conversation_id
        order by r.created_at desc, r.id desc
        limit 20
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_agent_conversations(uuid) from public, anon;
revoke all on function public.list_named_agent_conversations(uuid) from public, anon;
revoke all on function public.get_agent_conversation(uuid) from public, anon;
grant execute on function public.list_agent_conversations(uuid) to authenticated;
grant execute on function public.list_named_agent_conversations(uuid) to authenticated;
grant execute on function public.get_agent_conversation(uuid) to authenticated;
