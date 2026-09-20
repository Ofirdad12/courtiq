-- Product V1 performance hardening.
create index if not exists club_members_user_id_idx on public.club_members(user_id);
create index if not exists club_players_player_id_idx on public.club_players(player_id);
drop policy if exists "members_read_own_memberships" on public.club_members;
create policy "members_read_own_memberships" on public.club_members
for select to authenticated using (user_id = (select auth.uid()));
