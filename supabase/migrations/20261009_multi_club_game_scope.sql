-- CourtIQ multi-club foundation.
-- The same official game may legitimately exist in more than one club workspace.

alter table public.games
  drop constraint if exists games_provider_external_id_key;

alter table public.games
  add constraint games_club_provider_external_id_key
  unique (club_id, provider, external_id);

-- A club-scoped game is visible only to members of that club, while the
-- existing competition entitlement still applies.
drop policy if exists "competition access games" on public.games;
create policy "club and competition access games"
on public.games
for select
to authenticated
using (
  club_id is not null
  and private.is_club_member(club_id)
  and public.can_access_competition(coalesce(competition, ''))
);

create index if not exists games_club_date_idx
  on public.games (club_id, game_date desc nulls last);
