alter table public.password_shares
add column if not exists public_names text[] not null default '{}';

update public.shares
set expires_at = '9999-12-31 23:59:59+00'
where type = 'password';

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

drop function if exists public.get_password_share(text, text);

create function public.get_password_share(
  public_slug text,
  provided_access_hash text
)
returns table (
  encrypted_payload text,
  iv text,
  salt text,
  public_names text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    password_shares.encrypted_payload,
    password_shares.iv,
    password_shares.salt,
    password_shares.public_names
  from public.password_shares
  join public.shares on shares.id = password_shares.share_id
  where shares.slug = public_slug
    and shares.type = 'password'
    and shares.is_public = true
    and password_shares.access_code_hash = provided_access_hash
  limit 1;
$$;

grant execute on function public.get_password_share(text, text) to anon, authenticated;

drop policy if exists "password rows can be created for own or visitor shares"
on public.password_shares;

drop policy if exists "password rows can be updated for own or visitor shares"
on public.password_shares;

drop policy if exists "password rows can be created by owners"
on public.password_shares;

drop policy if exists "password rows can be updated by owners"
on public.password_shares;

create policy "password rows can be created by owners"
on public.password_shares for insert
with check (
  exists (
    select 1 from public.shares
    where shares.id = password_shares.share_id
    and shares.owner_id = auth.uid()
  )
);

create policy "password rows can be updated by owners"
on public.password_shares for update
using (
  exists (
    select 1 from public.shares
    where shares.id = password_shares.share_id
    and shares.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shares
    where shares.id = password_shares.share_id
    and shares.owner_id = auth.uid()
  )
);
