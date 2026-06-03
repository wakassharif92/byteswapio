drop table if exists public.cc_links;

create or replace function public.delete_expired_shares()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.shares
  where expires_at <= now()
    and type <> 'password';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
