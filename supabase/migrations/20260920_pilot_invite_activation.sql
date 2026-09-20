-- One-time pilot account invitations. No browser role can read invite codes.
create table if not exists public.pilot_invites (
  id uuid primary key default gen_random_uuid(),
  club_id bigint not null references public.clubs(id) on delete cascade,
  invitee_name text not null,
  invite_code uuid not null unique default gen_random_uuid(),
  role text not null default 'coach' check (role in ('admin','coach','analyst','viewer')),
  status text not null default 'pending' check (status in ('pending','processing','claimed','revoked')),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pilot_invites enable row level security;
revoke all on public.pilot_invites from anon, authenticated;
create policy "deny_direct_pilot_invite_access" on public.pilot_invites
for all to anon, authenticated using (false) with check (false);
create index if not exists pilot_invites_club_idx on public.pilot_invites(club_id);

insert into public.pilot_invites (club_id,invitee_name,role)
select id,'אודליה מדמון ריבל','coach'
from public.clubs
where slug='maccabi-bnot-ashdod'
and not exists (
  select 1 from public.pilot_invites
  where invitee_name='אודליה מדמון ריבל' and status='pending'
);
