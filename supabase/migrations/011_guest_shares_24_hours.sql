update public.shares
set expires_at = '9999-12-31 23:59:59+00'
where owner_id is not null
  or type in ('bookmark', 'password');

update public.shares
set expires_at = created_at + interval '24 hours'
where owner_id is null
  and type in ('code', 'document', 'link', 'note');
