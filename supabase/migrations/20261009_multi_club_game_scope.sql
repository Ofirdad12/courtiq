-- CourtIQ multi-club foundation.
-- The same official game may legitimately exist in more than one club workspace,
-- and every derived game artifact must remain isolated to that club tenant.

alter table public.games
  drop constraint if exists games_provider_external_id_key;

alter table public.games
  add constraint games_club_provider_external_id_key
  unique (club_id, provider, external_id);

create index if not exists games_club_date_idx
  on public.games (club_id, game_date desc nulls last);

-- Base game visibility = club membership AND competition entitlement.
drop policy if exists "competition access games" on public.games;
drop policy if exists "club and competition access games" on public.games;
create policy "club and competition access games"
on public.games
for select
to authenticated
using (
  club_id is not null
  and private.is_club_member(club_id)
  and public.can_access_competition(coalesce(competition, ''))
);

-- Player game memory inherits tenant scope from the parent game.
drop policy if exists "competition access player stats" on public.game_player_stats;
drop policy if exists "club and competition access player stats" on public.game_player_stats;
create policy "club and competition access player stats"
on public.game_player_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_player_stats.game_id
      and g.club_id is not null
      and private.is_club_member(g.club_id)
      and public.can_access_competition(coalesce(g.competition, ''))
  )
);

-- Saved reports inherit tenant scope from the parent game.
drop policy if exists "competition access game reports" on public.game_reports;
drop policy if exists "club and competition access game reports" on public.game_reports;
create policy "club and competition access game reports"
on public.game_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_reports.game_id
      and g.club_id is not null
      and private.is_club_member(g.club_id)
      and public.can_access_competition(coalesce(g.competition, ''))
  )
);

-- Data-quality evidence follows the same parent-game boundary.
drop policy if exists "competition access quality checks" on public.data_quality_checks;
drop policy if exists "club and competition access quality checks" on public.data_quality_checks;
create policy "club and competition access quality checks"
on public.data_quality_checks
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = data_quality_checks.game_id
      and g.club_id is not null
      and private.is_club_member(g.club_id)
      and public.can_access_competition(coalesce(g.competition, ''))
  )
);

-- Import audit rows are tenant-scoped even when an import failed before a game
-- row was created. Successful rows additionally inherit competition access.
drop policy if exists "competition access import runs" on public.import_runs;
drop policy if exists "club access import runs" on public.import_runs;
create policy "club access import runs"
on public.import_runs
for select
to authenticated
using (
  club_id is not null
  and private.is_club_member(club_id)
  and (
    game_id is null
    or exists (
      select 1
      from public.games g
      where g.id = import_runs.game_id
        and g.club_id = import_runs.club_id
        and public.can_access_competition(coalesce(g.competition, ''))
    )
  )
);
