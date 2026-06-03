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
