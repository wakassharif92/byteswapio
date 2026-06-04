alter table public.shares
alter column expires_at set default '9999-12-31 23:59:59+00';

update public.shares
set expires_at = '9999-12-31 23:59:59+00'
where not (
  type = 'note'
  and (
    coalesce(description, '') in ('copy-paste note', 'Fast copy-paste note')
    or title like 'CC %'
  )
);

update public.shares
set expires_at = created_at + interval '24 hours'
where type = 'note'
  and (
    coalesce(description, '') in ('copy-paste note', 'Fast copy-paste note')
    or title like 'CC %'
  );

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
