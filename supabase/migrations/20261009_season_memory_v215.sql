-- CourtIQ Season Memory v215
-- Live, tenant-safe memory surfaces. These views update automatically whenever
-- an official game import updates games/game_player_stats.

create or replace function private.courtiq_json_num(p_json jsonb, p_key text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_json is null then null
    when (p_json ->> p_key) ~ '^-?[0-9]+(?:\.[0-9]+)?$' then (p_json ->> p_key)::numeric
    else null
  end
$$;

revoke all on function private.courtiq_json_num(jsonb, text) from public;
revoke all on function private.courtiq_json_num(jsonb, text) from anon;
revoke all on function private.courtiq_json_num(jsonb, text) from authenticated;

create or replace view public.team_game_memory
with (security_invoker = true)
as
with expanded as (
  select
    g.id as game_id,
    g.club_id,
    g.provider,
    g.external_id,
    g.competition,
    g.game_date,
    g.created_at,
    g.source_url,
    x.side,
    x.team_name,
    x.opponent_name,
    x.team_raw,
    x.opp_raw
  from public.games g
  cross join lateral (
    values
      ('home'::text, g.home_team, g.away_team, g.payload #> '{raw,home}', g.payload #> '{raw,away}'),
      ('away'::text, g.away_team, g.home_team, g.payload #> '{raw,away}', g.payload #> '{raw,home}')
  ) as x(side, team_name, opponent_name, team_raw, opp_raw)
  where g.club_id is not null
), n as (
  select
    e.*,
    private.courtiq_json_num(team_raw,'points') as points_for,
    private.courtiq_json_num(opp_raw,'points') as points_against,
    private.courtiq_json_num(team_raw,'two_pm') as two_pm,
    private.courtiq_json_num(team_raw,'two_pa') as two_pa,
    private.courtiq_json_num(team_raw,'three_pm') as three_pm,
    private.courtiq_json_num(team_raw,'three_pa') as three_pa,
    private.courtiq_json_num(team_raw,'ftm') as ftm,
    private.courtiq_json_num(team_raw,'fta') as fta,
    private.courtiq_json_num(team_raw,'ast') as ast,
    private.courtiq_json_num(team_raw,'tov') as tov,
    private.courtiq_json_num(team_raw,'oreb') as oreb,
    private.courtiq_json_num(team_raw,'dreb') as dreb,
    private.courtiq_json_num(opp_raw,'two_pa') + private.courtiq_json_num(opp_raw,'three_pa') as opp_fga,
    private.courtiq_json_num(opp_raw,'fta') as opp_fta,
    private.courtiq_json_num(opp_raw,'oreb') as opp_oreb,
    private.courtiq_json_num(opp_raw,'dreb') as opp_dreb,
    private.courtiq_json_num(opp_raw,'tov') as opp_tov
  from expanded e
), calc as (
  select
    n.*,
    (two_pa + three_pa) as fga,
    case when (two_pa + three_pa) > 0 then 100 * (two_pm + 1.5 * three_pm) / (two_pa + three_pa) end as efg_pct,
    case when (two_pa + three_pa + 0.44 * fta) > 0 then 100 * points_for / (2 * (two_pa + three_pa + 0.44 * fta)) end as ts_pct,
    case when (two_pa + three_pa) > 0 then 100 * three_pa / (two_pa + three_pa) end as three_pa_rate,
    case when (two_pa + three_pa) > 0 then 100 * fta / (two_pa + three_pa) end as ft_rate,
    case when (oreb + opp_dreb) > 0 then 100 * oreb / (oreb + opp_dreb) end as orb_pct,
    case when (dreb + opp_oreb) > 0 then 100 * dreb / (dreb + opp_oreb) end as drb_pct,
    case
      when (two_pa + three_pa) is not null
       and fta is not null and oreb is not null and tov is not null
       and opp_fga is not null and opp_fta is not null and opp_oreb is not null and opp_tov is not null
      then 0.5 * (
        (two_pa + three_pa) + 0.44 * fta - oreb + tov
        + opp_fga + 0.44 * opp_fta - opp_oreb + opp_tov
      )
    end as possessions_est
  from n
)
select
  game_id,
  club_id,
  provider,
  external_id,
  competition,
  game_date,
  created_at,
  source_url,
  side,
  team_name,
  opponent_name,
  points_for,
  points_against,
  case when points_for is null or points_against is null then null else points_for > points_against end as won,
  two_pm,two_pa,three_pm,three_pa,ftm,fta,fga,ast,tov,oreb,dreb,opp_dreb,
  efg_pct,ts_pct,three_pa_rate,ft_rate,orb_pct,drb_pct,possessions_est,
  case when possessions_est > 0 then 100 * points_for / possessions_est end as ortg_est,
  case when possessions_est > 0 then 100 * points_against / possessions_est end as drtg_est
from calc;

comment on view public.team_game_memory is
  'Tenant-safe live team memory: one evidence row per team-game, automatically updated from official imports.';

revoke all on public.team_game_memory from public;
revoke all on public.team_game_memory from anon;
grant select on public.team_game_memory to authenticated;

create or replace view public.player_game_memory
with (security_invoker = true)
as
select
  gps.id as player_game_id,
  gps.game_id,
  g.club_id,
  g.game_date,
  g.created_at as game_created_at,
  gps.provider,
  gps.external_game_id,
  gps.season,
  gps.competition,
  gps.team_name,
  gps.opponent_name,
  gps.side,
  gps.player_id,
  gps.player_external_id,
  gps.player_name,
  gps.jersey_number,
  gps.starter,
  gps.minutes,
  gps.verified,
  gps.source_url,
  private.courtiq_json_num(gps.stats,'points') as points,
  coalesce(
    private.courtiq_json_num(gps.stats,'rebounds'),
    private.courtiq_json_num(gps.stats,'oreb') + private.courtiq_json_num(gps.stats,'dreb')
  ) as rebounds,
  private.courtiq_json_num(gps.stats,'oreb') as oreb,
  private.courtiq_json_num(gps.stats,'dreb') as dreb,
  private.courtiq_json_num(gps.stats,'ast') as ast,
  private.courtiq_json_num(gps.stats,'tov') as tov,
  private.courtiq_json_num(gps.stats,'steals') as steals,
  private.courtiq_json_num(gps.stats,'blocks') as blocks,
  private.courtiq_json_num(gps.stats,'two_pm') as two_pm,
  private.courtiq_json_num(gps.stats,'two_pa') as two_pa,
  private.courtiq_json_num(gps.stats,'three_pm') as three_pm,
  private.courtiq_json_num(gps.stats,'three_pa') as three_pa,
  private.courtiq_json_num(gps.stats,'ftm') as ftm,
  private.courtiq_json_num(gps.stats,'fta') as fta,
  private.courtiq_json_num(gps.calculated,'ts') as ts_pct,
  private.courtiq_json_num(gps.calculated,'efg') as efg_pct,
  private.courtiq_json_num(gps.calculated,'play_end_share') as play_end_share,
  private.courtiq_json_num(gps.calculated,'three_pa_rate') as three_pa_rate,
  gps.stats,
  gps.calculated
from public.game_player_stats gps
join public.games g on g.id = gps.game_id
where g.club_id is not null;

comment on view public.player_game_memory is
  'Tenant-safe live player memory: verified player-game evidence joined to club/game date for season and recent-form windows.';

revoke all on public.player_game_memory from public;
revoke all on public.player_game_memory from anon;
grant select on public.player_game_memory to authenticated;

create index if not exists game_player_stats_team_player_season_idx
  on public.game_player_stats (team_name, player_id, season);
