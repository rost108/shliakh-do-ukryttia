-- «Шлях до укриття» — таблиця лідерів у Supabase.
-- Запустити один раз: Supabase → SQL Editor → New query → вставити весь файл → Run.

create table if not exists public.scores (
  id          uuid primary key references auth.users (id) on delete cascade,  -- анонімний гравець
  name        text not null check (char_length(name) between 2 and 40),
  arches      int  not null default 0,
  bolts       int  not null default 0,
  top         int  not null default 0,
  best        jsonb not null default '{}'::jsonb,                            -- {рівень: {s, t, q}}
  skin        text not null default 'human' check (char_length(skin) <= 16),
  updated_at  timestamptz not null default now(),
  -- межі здорового глузду: не більше 3 арок і 1 блискавки на рівень, не більше 1000 рівнів
  check (top between 0 and 1000),
  check (arches between 0 and top * 3),
  check (bolts between 0 and top),
  check (pg_column_size(best) < 60000)
);

alter table public.scores enable row level security;

-- читати таблицю може кожен; писати — лише свій рядок
drop policy if exists "scores: read for all" on public.scores;
create policy "scores: read for all" on public.scores for select using (true);

drop policy if exists "scores: insert own" on public.scores;
create policy "scores: insert own" on public.scores for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "scores: update own" on public.scores;
create policy "scores: update own" on public.scores for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- оновлення таблиці наживо в грі
do $$ begin
  alter publication supabase_realtime add table public.scores;
exception when duplicate_object then null; end $$;
