create table if not exists public.cc_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  target_share_id uuid not null references public.shares(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour')
);

create index if not exists cc_links_slug_idx on public.cc_links(slug);
create index if not exists cc_links_target_share_id_idx on public.cc_links(target_share_id);
create index if not exists cc_links_expires_at_idx on public.cc_links(expires_at);

alter table public.cc_links enable row level security;

create policy "public can read non-expired cc links"
on public.cc_links for select
using (expires_at > now());

create policy "public can create cc links for non-expired public shares"
on public.cc_links for insert
with check (
  expires_at <= now() + interval '1 hour'
  and exists (
    select 1 from public.shares
    where shares.id = cc_links.target_share_id
    and shares.is_public = true
    and shares.expires_at > now()
  )
);

create or replace function public.delete_expired_shares()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  deleted_cc_count integer;
begin
  delete from public.cc_links
  where expires_at <= now()
    and type <> 'password';

  get diagnostics deleted_cc_count = row_count;

  delete from public.shares
  where expires_at <= now()
    and type <> 'password';

  get diagnostics deleted_count = row_count;
  return deleted_count + deleted_cc_count;
end;
$$;
