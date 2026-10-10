-- CourtIQ v233 · Video Intelligence production foundation

alter table public.game_videos
  add column if not exists source_type text not null default 'youtube',
  add column if not exists source_url text,
  add column if not exists provider_video_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.video_analysis_jobs
  add column if not exists club_id bigint references public.clubs(id) on delete cascade,
  add column if not exists game_db_id bigint references public.games(id) on delete cascade,
  add column if not exists video_id bigint references public.game_videos(id) on delete cascade,
  add column if not exists source_type text not null default 'storage',
  add column if not exists stage text not null default 'ingest',
  add column if not exists worker_contract_version text not null default 'tracking-to-tactics-v1',
  add column if not exists review_required integer not null default 0,
  add column if not exists accepted_events integer not null default 0;

alter table public.tactical_events
  add column if not exists job_id uuid references public.video_analysis_jobs(id) on delete set null;

create index if not exists video_analysis_jobs_club_time_idx
  on public.video_analysis_jobs (club_id, created_at desc);
create index if not exists video_analysis_jobs_game_idx
  on public.video_analysis_jobs (game_db_id, created_at desc);
create index if not exists tactical_events_job_idx
  on public.tactical_events (job_id);

-- Private bucket. Project-level limits still apply; CourtIQ never exposes a public bucket URL.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('courtiq-game-video', 'courtiq-game-video', false, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update
set public = excluded.public,
    allowed_mime_types = excluded.allowed_mime_types;

-- Replace pilot-era table policies with club + game scoped rules.
drop policy if exists "competition access game videos" on public.game_videos;
drop policy if exists "members_delete_game_videos" on public.game_videos;
drop policy if exists "members_insert_game_videos" on public.game_videos;
drop policy if exists "members_update_game_videos" on public.game_videos;

create policy "club members read game videos"
on public.game_videos for select to authenticated
using (
  private.is_club_member(club_id)
  and exists (
    select 1 from public.games g
    where g.id = game_videos.game_id
      and g.club_id = game_videos.club_id
      and can_access_competition(coalesce(g.competition,''))
  )
);

create policy "club members create own game videos"
on public.game_videos for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_club_member(club_id)
  and exists (
    select 1 from public.games g
    where g.id = game_videos.game_id
      and g.club_id = game_videos.club_id
      and can_access_competition(coalesce(g.competition,''))
  )
);

create policy "video owners update game videos"
on public.game_videos for update to authenticated
using (
  private.is_club_member(club_id)
  and (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.club_members m
      where m.club_id = game_videos.club_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin','analyst')
    )
  )
)
with check (
  private.is_club_member(club_id)
  and exists (select 1 from public.games g where g.id=game_videos.game_id and g.club_id=game_videos.club_id)
);

-- Tactical event RLS.
drop policy if exists "competition access tactical events" on public.tactical_events;
drop policy if exists "members_delete_tactical_events" on public.tactical_events;
drop policy if exists "members_insert_tactical_events" on public.tactical_events;
drop policy if exists "members_update_tactical_events" on public.tactical_events;

create policy "club members read tactical events"
on public.tactical_events for select to authenticated
using (
  private.is_club_member(club_id)
  and exists (
    select 1 from public.games g
    where g.id=tactical_events.game_id
      and g.club_id=tactical_events.club_id
      and can_access_competition(coalesce(g.competition,''))
  )
);

create policy "club staff create tactical events"
on public.tactical_events for insert to authenticated
with check (
  private.is_club_member(club_id)
  and (created_by is null or created_by=(select auth.uid()))
  and exists (select 1 from public.games g where g.id=tactical_events.game_id and g.club_id=tactical_events.club_id)
  and (
    video_id is null
    or exists (select 1 from public.game_videos v where v.id=tactical_events.video_id and v.club_id=tactical_events.club_id and v.game_id=tactical_events.game_id)
  )
);

create policy "video reviewers update tactical events"
on public.tactical_events for update to authenticated
using (
  private.is_club_member(club_id)
  and (
    created_by=(select auth.uid())
    or exists (
      select 1 from public.club_members m
      where m.club_id=tactical_events.club_id
        and m.user_id=(select auth.uid())
        and m.role in ('admin','analyst')
    )
  )
)
with check (
  private.is_club_member(club_id)
  and exists (select 1 from public.games g where g.id=tactical_events.game_id and g.club_id=tactical_events.club_id)
);

-- Analysis jobs are visible to the club; only the requester or admin/analyst can change them.
drop policy if exists "video jobs insert own" on public.video_analysis_jobs;
drop policy if exists "video jobs select own" on public.video_analysis_jobs;
drop policy if exists "video jobs update own" on public.video_analysis_jobs;

create policy "club members read video jobs"
on public.video_analysis_jobs for select to authenticated
using (
  club_id is not null
  and private.is_club_member(club_id)
  and (game_db_id is null or exists (select 1 from public.games g where g.id=video_analysis_jobs.game_db_id and g.club_id=video_analysis_jobs.club_id))
);

create policy "club members create own video jobs"
on public.video_analysis_jobs for insert to authenticated
with check (
  user_id=(select auth.uid())
  and club_id is not null
  and private.is_club_member(club_id)
  and game_db_id is not null
  and exists (select 1 from public.games g where g.id=video_analysis_jobs.game_db_id and g.club_id=video_analysis_jobs.club_id)
  and (video_id is null or exists (select 1 from public.game_videos v where v.id=video_analysis_jobs.video_id and v.club_id=video_analysis_jobs.club_id and v.game_id=video_analysis_jobs.game_db_id))
);

create policy "video job owners update jobs"
on public.video_analysis_jobs for update to authenticated
using (
  private.is_club_member(club_id)
  and (
    user_id=(select auth.uid())
    or exists (
      select 1 from public.club_members m
      where m.club_id=video_analysis_jobs.club_id
        and m.user_id=(select auth.uid())
        and m.role in ('admin','analyst')
    )
  )
)
with check (
  private.is_club_member(club_id)
  and exists (select 1 from public.games g where g.id=video_analysis_jobs.game_db_id and g.club_id=video_analysis_jobs.club_id)
);

-- Storage path contract: <club_id>/<game_id>/<uuid>.<ext>
drop policy if exists "club members read game video objects" on storage.objects;
drop policy if exists "club members upload game video objects" on storage.objects;

create policy "club members read game video objects"
on storage.objects for select to authenticated
using (
  bucket_id='courtiq-game-video'
  and split_part(name,'/',1) ~ '^[0-9]+$'
  and private.is_club_member(split_part(name,'/',1)::bigint)
);

create policy "club members upload game video objects"
on storage.objects for insert to authenticated
with check (
  bucket_id='courtiq-game-video'
  and split_part(name,'/',1) ~ '^[0-9]+$'
  and split_part(name,'/',2) ~ '^[0-9]+$'
  and private.is_club_member(split_part(name,'/',1)::bigint)
  and exists (
    select 1 from public.games g
    where g.id=split_part(name,'/',2)::bigint
      and g.club_id=split_part(name,'/',1)::bigint
  )
);

revoke all on public.game_videos from anon;
revoke all on public.tactical_events from anon;
revoke all on public.video_analysis_jobs from anon;

revoke all on public.game_videos from authenticated;
revoke all on public.tactical_events from authenticated;
revoke all on public.video_analysis_jobs from authenticated;

grant select,insert,update on public.game_videos to authenticated;
grant select,insert,update on public.tactical_events to authenticated;
grant select,insert,update on public.video_analysis_jobs to authenticated;
grant usage,select on sequence public.game_videos_id_seq to authenticated;
grant usage,select on sequence public.tactical_events_id_seq to authenticated;
