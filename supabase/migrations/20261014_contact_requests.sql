-- 先輩への連絡(メール)の記録。
-- 先に 20261013_senior_motivation.sql を実行してから、Supabase の SQL Editor でこのファイルを実行してください。
-- (何度実行しても壊れないように書いてあります。drop policy は、このファイルで作るポリシーの作り直しだけです)
--
-- メールはサーバー(アプリの Server Action)だけが送ります。このテーブルは「いつ・誰が・誰に送ったか」の
-- 記録で、1日の送信上限や、同じ相手への連続送信の制限にも使います。先輩のメールアドレスは保存しません。

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  category text not null default 'other' check (category in ('question','course','career','other')),
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

create index if not exists contact_requests_from_created_idx
  on public.contact_requests (from_user, created_at desc);

alter table public.contact_requests enable row level security;
grant select, insert, update on public.contact_requests to authenticated;

-- 送った本人と、受け取った先輩だけが読める
drop policy if exists "contact_requests_select_party" on public.contact_requests;
create policy "contact_requests_select_party" on public.contact_requests
  for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

-- 送る側は自分の名前でだけ作れる(最初の状態は pending のみ)
drop policy if exists "contact_requests_insert_own" on public.contact_requests;
create policy "contact_requests_insert_own" on public.contact_requests
  for insert to authenticated
  with check (from_user = auth.uid() and status = 'pending');

-- 送った本人だけが、送信結果(sent / failed)に更新できる
drop policy if exists "contact_requests_update_own" on public.contact_requests;
create policy "contact_requests_update_own" on public.contact_requests
  for update to authenticated
  using (from_user = auth.uid() and status = 'pending')
  with check (from_user = auth.uid() and status in ('sent','failed'));
