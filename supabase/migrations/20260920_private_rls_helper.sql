-- Keep the RLS membership helper out of the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_club_member(target_club_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.club_members m
  where m.club_id = target_club_id and m.user_id = auth.uid()
); $$;
revoke all on function private.is_club_member(bigint) from public, anon;
grant execute on function private.is_club_member(bigint) to authenticated;

drop policy if exists "members_read_clubs" on public.clubs;
create policy "members_read_clubs" on public.clubs for select to authenticated using (private.is_club_member(id));
drop policy if exists "members_read_games" on public.games;
create policy "members_read_games" on public.games for select to authenticated using (club_id is not null and private.is_club_member(club_id));
drop policy if exists "members_read_club_players" on public.club_players;
create policy "members_read_club_players" on public.club_players for select to authenticated using (private.is_club_member(club_id));
drop policy if exists "members_read_players" on public.players;
create policy "members_read_players" on public.players for select to authenticated using (
  exists (select 1 from public.club_players cp where cp.player_id=players.id and private.is_club_member(cp.club_id))
);
drop policy if exists "members_read_player_samples" on public.player_samples;
create policy "members_read_player_samples" on public.player_samples for select to authenticated using (
  exists (select 1 from public.club_players cp where cp.player_id=player_samples.player_id and private.is_club_member(cp.club_id))
);
drop function if exists public.is_club_member(bigint);
