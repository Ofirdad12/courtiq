-- Applied to the pilot after the coach workflow migration.
alter function public.record_game_source_revision() set search_path = public, pg_temp;
