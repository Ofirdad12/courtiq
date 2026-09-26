create table if not exists public.user_competition_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  competition text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, competition)
);
alter table public.user_competition_access enable row level security;
grant select, insert, delete on public.user_competition_access to authenticated;
create policy "users read own competition access" on public.user_competition_access for select to authenticated using ((select auth.uid()) = user_id);
create policy "users choose own competition access" on public.user_competition_access for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users remove own competition access" on public.user_competition_access for delete to authenticated using ((select auth.uid()) = user_id);