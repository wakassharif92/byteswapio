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

grant execute on function public.delete_expired_shares() to authenticated;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'delete-expired-shares';
exception
  when undefined_table or undefined_function then
    null;
end;
$$;

select cron.schedule(
  'delete-expired-shares',
  '*/15 * * * *',
  $$select public.delete_expired_shares();$$
);
