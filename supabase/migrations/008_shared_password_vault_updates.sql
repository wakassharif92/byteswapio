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
) to anon, authenticated;
