-- 研究への協力(毎週の短い回答)。参加は本人の同意が前提で、いつでも抜けられる。
-- 回答は本人だけが読める。研究者は Supabase の管理画面(service role)から集計する。

create table if not exists public.research_participants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists public.research_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,                       -- その週の月曜日(日本時間)
  skipped boolean not null default false,         -- 「今週は答えない」
  ease smallint check (ease between 1 and 5),     -- 続けやすさ 1〜5
  reason text check (char_length(reason) <= 300),
  wish text check (char_length(wish) <= 300),
  created_at timestamptz not null default now(),
  unique (user_id, week_start),
  check (skipped or ease is not null)
);

alter table public.research_participants enable row level security;
alter table public.research_checkins enable row level security;

drop policy if exists research_participants_select on public.research_participants;
drop policy if exists research_participants_insert on public.research_participants;
drop policy if exists research_participants_update on public.research_participants;
drop policy if exists research_participants_delete on public.research_participants;
create policy research_participants_select on public.research_participants
  for select using (user_id = auth.uid());
create policy research_participants_insert on public.research_participants
  for insert with check (user_id = auth.uid() and withdrawn_at is null);
create policy research_participants_update on public.research_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy research_participants_delete on public.research_participants
  for delete using (user_id = auth.uid());

drop policy if exists research_checkins_select on public.research_checkins;
drop policy if exists research_checkins_insert on public.research_checkins;
drop policy if exists research_checkins_update on public.research_checkins;
drop policy if exists research_checkins_delete on public.research_checkins;
create policy research_checkins_select on public.research_checkins
  for select using (user_id = auth.uid());
create policy research_checkins_insert on public.research_checkins
  for insert with check (user_id = auth.uid());
create policy research_checkins_update on public.research_checkins
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy research_checkins_delete on public.research_checkins
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.research_participants to authenticated;
grant select, insert, update, delete on public.research_checkins to authenticated;
