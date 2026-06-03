create extension if not exists pgcrypto;

create type public.share_type as enum (
  'code',
  'document',
  'link',
  'bookmark',
  'note',
  'password'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  type public.share_type not null,
  slug text not null unique,
  title text not null,
  description text,
  url text,
  language text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days')
);

create table public.share_contents (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null unique references public.shares(id) on delete cascade,
  body text,
  html text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.password_shares (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null unique references public.shares(id) on delete cascade,
  encrypted_payload text not null,
  iv text not null,
  salt text not null,
  access_code_hash text not null,
  decrypt_code_hash text not null,
  public_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shares_owner_id_idx on public.shares(owner_id);
create index shares_slug_idx on public.shares(slug);
create index shares_expires_at_idx on public.shares(expires_at);
create index share_contents_share_id_idx on public.share_contents(share_id);
create index password_shares_share_id_idx on public.password_shares(share_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger shares_touch_updated_at
before update on public.shares
for each row execute function public.touch_updated_at();

create trigger share_contents_touch_updated_at
before update on public.share_contents
for each row execute function public.touch_updated_at();

create trigger password_shares_touch_updated_at
before update on public.password_shares
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.shares enable row level security;
alter table public.share_contents enable row level security;
alter table public.password_shares enable row level security;

create policy "profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles are insertable by owner"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "owners and public visitors can read permitted shares"
on public.shares for select
using (
  auth.uid() = owner_id
  or (is_public = true and expires_at > now())
);

create policy "users and visitors can create shares"
on public.shares for insert
with check (
  owner_id is null
  or auth.uid() = owner_id
);

create policy "owners can update their shares"
on public.shares for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "temporary visitor shares can be updated before expiry"
on public.shares for update
using (owner_id is null and expires_at > now())
with check (owner_id is null and expires_at > now());

create policy "owners can delete their shares"
on public.shares for delete
using (auth.uid() = owner_id);

create policy "owners and public visitors can read permitted contents"
on public.share_contents for select
using (
  exists (
    select 1 from public.shares
    where shares.id = share_contents.share_id
    and (
      shares.owner_id = auth.uid()
      or (shares.is_public = true and shares.expires_at > now())
    )
  )
);

create policy "contents can be created for own or visitor shares"
on public.share_contents for insert
with check (
  exists (
    select 1 from public.shares
    where shares.id = share_contents.share_id
    and (shares.owner_id = auth.uid() or shares.owner_id is null)
  )
);

create policy "contents can be updated for own or live public shares"
on public.share_contents for update
using (
  exists (
    select 1 from public.shares
    where shares.id = share_contents.share_id
    and (
      shares.owner_id = auth.uid()
      or (shares.owner_id is null and shares.expires_at > now())
      or (
        shares.is_public = true
        and shares.expires_at > now()
        and shares.type <> 'password'
      )
    )
  )
)
with check (
  exists (
    select 1 from public.shares
    where shares.id = share_contents.share_id
    and (
      shares.owner_id = auth.uid()
      or (shares.owner_id is null and shares.expires_at > now())
      or (
        shares.is_public = true
        and shares.expires_at > now()
        and shares.type <> 'password'
      )
    )
  )
);

create policy "contents can be deleted by owners"
on public.share_contents for delete
using (
  exists (
    select 1 from public.shares
    where shares.id = share_contents.share_id
    and shares.owner_id = auth.uid()
  )
);

create policy "password rows are readable by owners only"
on public.password_shares for select
using (
  exists (
    select 1 from public.shares
    where shares.id = password_shares.share_id
    and shares.owner_id = auth.uid()
  )
);

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

create policy "password rows can be deleted by owners"
on public.password_shares for delete
using (
  exists (
    select 1 from public.shares
    where shares.id = password_shares.share_id
    and shares.owner_id = auth.uid()
  )
);

create or replace function public.get_password_share(
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

alter publication supabase_realtime add table public.shares;
alter publication supabase_realtime add table public.share_contents;
