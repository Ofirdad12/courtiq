-- Canonical Maccabi Bnot Ashdod 2026/27 roster for Player Intelligence and Compare Players.
-- Performance samples remain empty until an official IBBA/FIBA box score is imported.
with roster(external_id,name,legacy_name) as (
  values
    ('ashdod-2026-27-anja-fuchs-robetin','Anja Fuchs-Robetin','Anja Fuchs-Robetin'),
    ('ashdod-2026-27-dor-saar','Dor Saar','Dor Saar'),
    ('ashdod-2026-27-tzilil-vaturi','Tzilil Vaturi','Tzilil Vaturi'),
    ('ashdod-2026-27-gal-cohen','Gal Cohen','Gal Cohen'),
    ('ashdod-2026-27-abby-meyers','Abby Meyers','Abby Meyers'),
    ('ashdod-2026-27-jazmine-jones','Jazmine Jones','Jazmine Jones'),
    ('ashdod-2026-27-kat-vuckovic','Kat Vuckovic','Kat Vuckovic'),
    ('ashdod-2026-27-yahel-jovanovic','Yahel Jovanovic','Yahel Yenbin'),
    ('ashdod-2026-27-paula-estebas','Paula Estebas','Paula Estebas'),
    ('ashdod-2026-27-dalayah-daniels','Dalayah Daniels','Dalayah Daniels')
)
update public.players p
set external_id=r.external_id,name=r.name
from roster r
where (p.name=r.name or p.name=r.legacy_name)
  and exists (
    select 1 from public.club_players cp
    join public.clubs c on c.id=cp.club_id
    where cp.player_id=p.id and cp.season='2026-27' and c.slug='maccabi-bnot-ashdod'
  );

with roster(external_id,name) as (
  values
    ('ashdod-2026-27-anja-fuchs-robetin','Anja Fuchs-Robetin'),
    ('ashdod-2026-27-dor-saar','Dor Saar'),
    ('ashdod-2026-27-tzilil-vaturi','Tzilil Vaturi'),
    ('ashdod-2026-27-gal-cohen','Gal Cohen'),
    ('ashdod-2026-27-abby-meyers','Abby Meyers'),
    ('ashdod-2026-27-jazmine-jones','Jazmine Jones'),
    ('ashdod-2026-27-kat-vuckovic','Kat Vuckovic'),
    ('ashdod-2026-27-yahel-jovanovic','Yahel Jovanovic'),
    ('ashdod-2026-27-paula-estebas','Paula Estebas'),
    ('ashdod-2026-27-dalayah-daniels','Dalayah Daniels')
)
insert into public.players(external_id,name)
select r.external_id,r.name from roster r
where not exists (select 1 from public.players p where p.external_id=r.external_id);

with roster(external_id) as (
  values
    ('ashdod-2026-27-anja-fuchs-robetin'),('ashdod-2026-27-dor-saar'),
    ('ashdod-2026-27-tzilil-vaturi'),('ashdod-2026-27-gal-cohen'),
    ('ashdod-2026-27-abby-meyers'),('ashdod-2026-27-jazmine-jones'),
    ('ashdod-2026-27-kat-vuckovic'),('ashdod-2026-27-yahel-jovanovic'),
    ('ashdod-2026-27-paula-estebas'),('ashdod-2026-27-dalayah-daniels')
)
insert into public.club_players(club_id,player_id,season,roster_status)
select c.id,p.id,'2026-27','roster'
from roster r
join public.players p on p.external_id=r.external_id
join public.clubs c on c.slug='maccabi-bnot-ashdod'
on conflict (club_id,player_id,season) do update set roster_status='roster';
