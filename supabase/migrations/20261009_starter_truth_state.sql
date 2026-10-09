-- CourtIQ commercial integrity: starter/bench must be evidence-backed.
-- A nullable starter flag represents three states: true=starter, false=bench, null=unknown.

alter table public.game_player_stats
  alter column starter drop not null,
  alter column starter drop default;

comment on column public.game_player_stats.starter is
  'Tri-state starter evidence: true=verified starter, false=verified bench, null=unknown/not evidenced.';

-- Existing PLK imports had no verified starter evidence and were persisted as false.
-- Restore epistemic truth instead of treating every player as bench.
update public.game_player_stats
set starter = null,
    stats = coalesce(stats, '{}'::jsonb) || jsonb_build_object(
      'starter', null,
      'starter_verified', false,
      'starter_source', 'unknown'
    ),
    updated_at = now()
where provider = 'PLK';

create or replace function private.courtiq_preserve_starter_truth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Until a PLK parser/enrichment step explicitly marks starter evidence as
  -- verified, false must not silently mean bench.
  if new.provider = 'PLK'
     and coalesce(new.stats->>'starter_verified', 'false') <> 'true' then
    new.starter := null;
    new.stats := coalesce(new.stats, '{}'::jsonb) || jsonb_build_object(
      'starter', null,
      'starter_verified', false,
      'starter_source', coalesce(new.stats->>'starter_source', 'unknown')
    );
  end if;
  return new;
end;
$$;

revoke all on function private.courtiq_preserve_starter_truth() from public;
revoke all on function private.courtiq_preserve_starter_truth() from anon;
revoke all on function private.courtiq_preserve_starter_truth() from authenticated;

drop trigger if exists courtiq_preserve_starter_truth on public.game_player_stats;
create trigger courtiq_preserve_starter_truth
before insert or update of provider, starter, stats
on public.game_player_stats
for each row
execute function private.courtiq_preserve_starter_truth();
