-- Authenticated club-scoped read policies for CourtIQ Product V1.
create or replace function public.is_club_member(target_club_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.club_members m
  where m.club_id = target_club_id and m.user_id = auth.uid()
); $$;
revoke all on function public.is_club_member(bigint) from public;
grant execute on function public.is_club_member(bigint) to authenticated;

create policy "members_read_own_memberships" on public.club_members
for select to authenticated using (user_id = auth.uid());
create policy "members_read_clubs" on public.clubs
for select to authenticated using (public.is_club_member(id));
create policy "members_read_games" on public.games
for select to authenticated using (club_id is not null and public.is_club_member(club_id));
create policy "members_read_club_players" on public.club_players
for select to authenticated using (public.is_club_member(club_id));
create policy "members_read_players" on public.players
for select to authenticated using (
  exists (select 1 from public.club_players cp
          where cp.player_id = players.id and public.is_club_member(cp.club_id))
);
create policy "members_read_player_samples" on public.player_samples
for select to authenticated using (
  exists (select 1 from public.club_players cp
          where cp.player_id = player_samples.player_id and public.is_club_member(cp.club_id))
);
