create table if not exists public.password_share_access (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (share_id, email)
);

create index if not exists password_share_access_share_id_idx
on public.password_share_access(share_id);

create index if not exists password_share_access_email_idx
on public.password_share_access(lower(email));

alter table public.password_share_access enable row level security;

drop policy if exists "owners can manage password access"
on public.password_share_access;

create policy "owners can manage password access"
on public.password_share_access for all
using (
  exists (
    select 1 from public.shares
    where shares.id = password_share_access.share_id
    and shares.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shares
    where shares.id = password_share_access.share_id
    and shares.owner_id = auth.uid()
  )
);

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
    and auth.uid() is not null
    and (
      shares.owner_id = auth.uid()
      or exists (
        select 1 from public.password_share_access access
        where access.share_id = shares.id
        and lower(access.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
    and password_shares.access_code_hash = provided_access_hash
  limit 1;
$$;

grant execute on function public.get_password_share(text, text) to authenticated;

drop function if exists public.update_password_share(
  text,
  text,
  text,
  text,
  text,
  text,
  text[]
);

create function public.update_password_share(
  public_slug text,
  provided_access_hash text,
  new_encrypted_payload text,
  new_iv text,
  new_salt text,
  new_decrypt_hash text,
  new_public_names text[]
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.password_shares
  set
    encrypted_payload = new_encrypted_payload,
    iv = new_iv,
    salt = new_salt,
    decrypt_code_hash = new_decrypt_hash,
    public_names = new_public_names,
    updated_at = now()
  from public.shares
  where shares.id = password_shares.share_id
    and shares.slug = public_slug
    and shares.type = 'password'
    and shares.is_public = true
    and auth.uid() is not null
    and (
      shares.owner_id = auth.uid()
      or exists (
        select 1 from public.password_share_access access
        where access.share_id = shares.id
        and lower(access.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
    and password_shares.access_code_hash = provided_access_hash;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

grant execute on function public.update_password_share(
  text,
  text,
  text,
  text,
  text,
  text,
  text[]
) to authenticated;
