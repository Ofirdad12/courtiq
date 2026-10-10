-- CourtIQ v233 · persist low-confidence AI detections for analyst review.
alter table public.tactical_events
  drop constraint if exists tactical_events_verification_check;
alter table public.tactical_events
  add constraint tactical_events_verification_check
  check (verification in ('ai','needs_review','human','human_corrected'));
