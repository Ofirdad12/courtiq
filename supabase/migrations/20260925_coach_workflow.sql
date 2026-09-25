-- Club-scoped source coverage, immutable evidence, source revisions, report review.
create table if not exists public.schedule_games (
 id bigint generated always as identity primary key,
 club_id bigint not null references public.clubs(id) on delete cascade,
 competition text not null, season text not null, provider text not null,
 source_url text not null check (source_url ~ '^https://'),
 game_date date, home_team text not null, away_team text not null,
 status text not null default 'scheduled' check (status in ('scheduled','final','cancelled')),
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(),
 unique (club_id,source_url)
);
create table if not exists public.evidence_annotations (
 id bigint generated always as identity primary key,
 club_id bigint not null references public.clubs(id) on delete cascade,
 game_id bigint not null references public.games(id) on delete cascade,
 claim_key text not null check (claim_key in ('turnovers','shooting','rebounding')),
 polarity text not null check (polarity in ('supports','counterexample')),
 video_url text not null check (video_url ~ '^https://'),
 start_seconds integer not null check (start_seconds >= 0),
 end_seconds integer check (end_seconds is null or end_seconds > start_seconds),
 possession_note text not null check (length(trim(possession_note)) between 5 and 1000),
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.game_revisions (
 id bigint generated always as identity primary key,
 club_id bigint not null references public.clubs(id) on delete cascade,
 game_id bigint not null references public.games(id) on delete cascade,
 previous_hash text not null, current_hash text not null,
 previous_payload jsonb not null, changed_at timestamptz not null default now()
);
create table if not exists public.report_reviews (
 id bigint generated always as identity primary key,
 club_id bigint not null references public.clubs(id) on delete cascade,
 report_id bigint not null references public.game_reports(id) on delete cascade,
 report_updated_at timestamptz not null,
 decision text not null check (decision in ('approved','rejected')),
 note text not null default '', reviewer_id uuid not null default auth.uid(),
 reviewed_at timestamptz not null default now()
);
create index if not exists evidence_game_claim_idx on public.evidence_annotations(game_id,claim_key,created_at);
create index if not exists revisions_game_idx on public.game_revisions(game_id,changed_at desc);
create index if not exists reviews_report_idx on public.report_reviews(report_id,reviewed_at desc);

create or replace function public.record_game_source_revision() returns trigger language plpgsql set search_path = public, pg_temp as $$
declare before_hash text; after_hash text;
begin
 before_hash := md5((old.payload - 'imported_at')::text);
 after_hash := md5((new.payload - 'imported_at')::text);
 if before_hash is distinct from after_hash then
   insert into public.game_revisions(club_id,game_id,previous_hash,current_hash,previous_payload)
   values(old.club_id,old.id,before_hash,after_hash,old.payload);
 end if;
 return new;
end $$;
drop trigger if exists track_game_source_revision on public.games;
create trigger track_game_source_revision after update of payload on public.games
for each row execute function public.record_game_source_revision();

alter table public.schedule_games enable row level security;
alter table public.evidence_annotations enable row level security;
alter table public.game_revisions enable row level security;
alter table public.report_reviews enable row level security;
revoke all on public.schedule_games,public.evidence_annotations,public.game_revisions,public.report_reviews from anon,authenticated;
grant select,insert,update on public.schedule_games to authenticated;
grant select,insert on public.evidence_annotations,public.report_reviews to authenticated;
grant select on public.game_revisions to authenticated;
grant select,insert,update,delete on public.schedule_games,public.evidence_annotations,public.game_revisions,public.report_reviews to service_role;
grant usage on sequence public.schedule_games_id_seq,public.evidence_annotations_id_seq,public.report_reviews_id_seq to authenticated;

create policy schedule_read on public.schedule_games for select to authenticated using (private.is_club_member(club_id));
create policy schedule_insert on public.schedule_games for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.club_members m where m.club_id=schedule_games.club_id and m.user_id=(select auth.uid()) and m.role in ('admin','analyst'))
);
create policy schedule_update on public.schedule_games for update to authenticated
 using (exists(select 1 from public.club_members m where m.club_id=schedule_games.club_id and m.user_id=(select auth.uid()) and m.role in ('admin','analyst')))
 with check (exists(select 1 from public.club_members m where m.club_id=schedule_games.club_id and m.user_id=(select auth.uid()) and m.role in ('admin','analyst')));
create policy evidence_read on public.evidence_annotations for select to authenticated using (private.is_club_member(club_id));
create policy evidence_insert on public.evidence_annotations for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.games g where g.id=game_id and g.club_id=evidence_annotations.club_id)
 and exists(select 1 from public.club_members m where m.club_id=evidence_annotations.club_id and m.user_id=(select auth.uid()) and m.role in ('admin','analyst'))
);
create policy revisions_read on public.game_revisions for select to authenticated using (private.is_club_member(club_id));
create policy reviews_read on public.report_reviews for select to authenticated using (private.is_club_member(club_id));
create policy reviews_insert on public.report_reviews for insert to authenticated with check (
 reviewer_id=(select auth.uid())
 and exists(select 1 from public.game_reports r join public.games g on g.id=r.game_id where r.id=report_id and r.updated_at=report_updated_at and g.club_id=report_reviews.club_id)
 and exists(select 1 from public.club_members m where m.club_id=report_reviews.club_id and m.user_id=(select auth.uid()) and m.role in ('admin','analyst'))
);
