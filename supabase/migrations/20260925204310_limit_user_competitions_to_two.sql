create or replace function public.enforce_max_two_competitions()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.user_competition_access where user_id = new.user_id) >= 2 then
    raise exception 'Maximum 2 leagues per user';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_max_two_competitions_trigger on public.user_competition_access;
create trigger enforce_max_two_competitions_trigger before insert on public.user_competition_access for each row execute function public.enforce_max_two_competitions();