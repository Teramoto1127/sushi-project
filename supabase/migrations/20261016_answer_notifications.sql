-- 回答・返信の通知(質問者や、回答者に届く)。研究のフィードバックを募る質問にも、そのまま使える。
-- 1. notifications.type に 'answer'(質問に回答が付いた)と 'reply'(回答に返信が付いた)を許可する。
--    type が text + check 制約でも、enum でも動くようにしてある。
do $$
declare
  c record;
  dt text;
  udt text;
begin
  select data_type, udt_name into dt, udt
    from information_schema.columns
   where table_schema = 'public' and table_name = 'notifications' and column_name = 'type';

  if dt = 'USER-DEFINED' then
    execute format('alter type public.%I add value if not exists %L', udt, 'answer');
    execute format('alter type public.%I add value if not exists %L', udt, 'reply');
  else
    for c in
      select conname from pg_constraint
       where conrelid = 'public.notifications'::regclass
         and contype = 'c'
         and pg_get_constraintdef(oid) ilike '%type%'
    loop
      execute format('alter table public.notifications drop constraint %I', c.conname);
    end loop;
    alter table public.notifications
      add constraint notifications_type_check check (type in ('helpful', 'solved', 'answer', 'reply'));
  end if;
end $$;

-- 2. 貢献の集計は「助かった」「解決」の通知だけを数える(回答が付いた通知で、数が増えないように)。
create or replace function public.contribution_stats(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  select (p_user = auth.uid())
      or coalesce((select p.contribution_public from public.profiles p where p.user_id = p_user), false)
    into allowed;

  if not allowed then
    return null;
  end if;

  return jsonb_build_object(
    'answers',  (select count(*) from public.answers a
                  where a.author_id = p_user and a.parent_id is null),
    'helpful',  (select count(*) from public.notifications n
                  where n.user_id = p_user and n.type = 'helpful'),
    'solved',   (select count(*) from public.notifications n
                  where n.user_id = p_user and n.type = 'solved'),
    'reasons',  coalesce((
                  select jsonb_object_agg(x.reason, x.cnt)
                  from (
                    select r as reason, count(*) as cnt
                    from public.notifications n, unnest(n.reasons) as r
                    where n.user_id = p_user and n.type = 'helpful'
                    group by r
                  ) x
                ), '{}'::jsonb),
    -- タグごとに「力になれた質問」の数(同じ質問は1回だけ数える)
    'tags',     coalesce((
                  select jsonb_object_agg(y.tag, y.cnt)
                  from (
                    select t as tag, count(distinct n.question_id) as cnt
                    from public.notifications n
                    join public.questions q on q.id = n.question_id,
                    unnest(q.tags) as t
                    where n.user_id = p_user and n.type in ('helpful', 'solved')
                    group by t
                  ) y
                ), '{}'::jsonb),
    'first_at', (select min(a.created_at) from public.answers a where a.author_id = p_user)
  );
end;
$$;

revoke all on function public.contribution_stats(uuid) from public;
grant execute on function public.contribution_stats(uuid) to authenticated;
