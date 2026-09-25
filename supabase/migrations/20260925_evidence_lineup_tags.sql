-- Optional, staff-supplied lineup description on a reviewed possession.
-- No lineup ratings are inferred from this tag.
alter table public.evidence_annotations
 add column if not exists lineup_label text check (lineup_label is null or length(lineup_label) <= 160);
