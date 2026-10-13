-- 先輩が続けやすくなる機能のためのDB変更。
-- 既存のコードより先に、Supabase の SQL Editor でこのファイルを実行してください。
-- (何度実行しても壊れないように書いてあります)

-- 1. プロフィール: 休止期間と、貢献ページの公開設定
alter table public.profiles
  add column if not exists paused_until timestamptz,
  add column if not exists contribution_public boolean not null default false;

-- 2. 学びメモ: 回答した本人だけが読み書きできる
create table if not exists public.learning_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, answer_id)
);

alter table public.learning_notes enable row level security;
grant select, insert, update, delete on public.learning_notes to authenticated;

drop policy if exists "learning_notes_select_own" on public.learning_notes;
create policy "learning_notes_select_own" on public.learning_notes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "learning_notes_insert_own" on public.learning_notes;
create policy "learning_notes_insert_own" on public.learning_notes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.answers a
      where a.id = answer_id and a.author_id = auth.uid()
    )
  );

drop policy if exists "learning_notes_update_own" on public.learning_notes;
create policy "learning_notes_update_own" on public.learning_notes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "learning_notes_delete_own" on public.learning_notes;
create policy "learning_notes_delete_own" on public.learning_notes
  for delete to authenticated
  using (user_id = auth.uid());

-- 3. 貢献の集計。本人、または貢献ページを公開している人の分だけ返す(それ以外は null)。
--    notifications は本人しか読めないため、security definer で集計だけを公開する。
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
                    where n.user_id = p_user
                    group by t
                  ) y
                ), '{}'::jsonb),
    'first_at', (select min(a.created_at) from public.answers a where a.author_id = p_user)
  );
end;
$$;

revoke all on function public.contribution_stats(uuid) from public;
grant execute on function public.contribution_stats(uuid) to authenticated;
