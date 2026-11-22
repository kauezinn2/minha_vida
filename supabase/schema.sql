-- Run once in a Supabase project.
create table public.personal_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('transactions','goals','events')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'title' and payload ? 'date' and payload ? 'id' and payload->>'id' = id::text),
  revision bigint not null default 1,
  deleted boolean not null default false,
  primary key (user_id, kind, id)
);
alter table public.personal_records enable row level security;
revoke all on public.personal_records from anon, authenticated;
grant select, insert, update on public.personal_records to authenticated;
create policy own_read on public.personal_records for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.personal_records for insert to authenticated with check (user_id = (select auth.uid()) and revision=1);
create policy own_update on public.personal_records for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create function public.advance_personal_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.user_id, new.id, new.kind) is distinct from (old.user_id, old.id, old.kind) then
    raise exception 'record identity is immutable';
  end if;
  new.revision := old.revision+1;
  return new;
end;
$$;
create trigger advance_revision before update on public.personal_records for each row execute function public.advance_personal_revision();

