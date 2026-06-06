# ByteSwapio

ByteSwapio is a production-ready MVP for live shares built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase only.

## Features

- Share code, live coding rooms, documents, links, bookmarks, notes, and encrypted passwords.
- Public `/s/[slug]` links update live with Supabase Realtime.
- Fast copy-paste links at `/cc` create 24-hour live notes with simple names such as `/cc/ali92`.
- Live coding rooms use `/share/live-code`, update in realtime, and expire after 3 hours.
- Regular shares use short names such as `/s/anderson92`.
- Password vault links use long high-entropy URLs and never expire automatically.
- Logged-in shares stay available until deleted; guest code, document, link, and note shares expire after 24 hours.
- Password vault links do not expire automatically; only the owner can delete them from the dashboard.
- Authenticated users get a private dashboard at `/dashboard`.
- Guest and CC links are temporary and are deleted from Postgres after expiry.
- Password shares are encrypted vault files with multiple name/password rows. Plain passwords are never stored.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=https://www.byteswapio.com
```

3. Create a Supabase project and run all SQL files in order:

```sql
-- Paste and execute supabase/migrations/*.sql in filename order,
-- or apply it with the Supabase CLI if you use linked local migrations.
```

4. In Supabase, enable Realtime for `shares` and `share_contents` if your project does not do it automatically from the migration publication statements.

5. Run the app:

```bash
npm run dev
```

## Database

The migration creates these tables:

- `profiles`: one profile row per Supabase Auth user.
- `shares`: share metadata, owner, type, slug, title, URL, language, and `expires_at`. Logged-in shares have `owner_id`; guest links use `owner_id = null`.
- `share_contents`: live body/HTML/notes content for non-password shares.
- `password_shares`: encrypted vault payload, AES-GCM IV, PBKDF2 salt, access password hash, PIN hash, and non-secret public names.

RLS policies created:

- `profiles`: users can read, insert, and update only their own profile.
- `shares`: owners can read/update/delete their own shares; public visitors can read non-expired public shares by slug; users and visitors can create shares; temporary visitor shares can be updated before expiry.
- `share_contents`: owners and public visitors can read content for non-expired public shares; content can be created for owned or temporary visitor shares; content can be updated by owners and by public visitors on non-expired, non-password public shares for live writing; owners can delete content.
- `password_shares`: direct reads are owner-only; password access goes through `get_password_share(public_slug, provided_access_hash)`, which returns encrypted vault fields only after the access password hash matches. The 5-number PIN decrypts in the browser only.

Cleanup created:

- `delete_expired_shares()`: deletes rows from `shares` where `expires_at <= now()`. In the current product rules, that removes expired guest shares and `/cc` pasteboards. Related `share_contents` and `password_shares` rows are removed by cascade.
- `delete-expired-shares` pg_cron job: runs every 15 minutes.

## Routes

- `/`
- `/cc`
- `/cc/[slug]`
- `/share`
- `/share/code`
- `/share/document`
- `/share/link`
- `/share/live-code`
- `/share/bookmark`
- `/share/note`
- `/share/password`
- `/s/[slug]`
- `/dashboard`
- `/login`
- `/register`

## Notes

This MVP uses Supabase Auth, Postgres, Realtime, and the official Supabase SSR/browser clients. It does not use Firebase, Express, MongoDB, Prisma, Socket.io, or a custom backend server. Supabase Storage is available in the stack but not required for this first version because document content is stored as HTML in Postgres.

## Live writing

Realtime is enabled for `shares` and `share_contents` in the migration. The public `/s/[slug]` page renders editable fields for code, documents, links, bookmarks, and notes. When any viewer edits the shared text, the app updates `share_contents`, and every other open viewer receives the change through Supabase Realtime.

Live coding rooms are a code-editor variant for interviews or pairing sessions. They are saved to the creator dashboard when the creator is logged in, can be deleted manually, and are deleted automatically after 3 hours.

Password shares are intentionally different: anonymous users cannot create password shares. Anyone with the link must enter the access password first, then a 5-number PIN for a specific row. The revealed password hides again after 5 seconds.

Shared password vault links allow viewers with the access password and PIN to add or update vault rows. Changes are saved manually with the Save button; there is no automatic password vault save.

## Logged-in vs guest shares

When a logged-in user creates a document or any other share, ByteSwapio stores it with their `owner_id`, so it appears in `/dashboard` and stays available until deleted. Anonymous users can still create a public guest link, but it does not appear in a dashboard and expires after 24 hours. `/cc` pasteboards also expire after 24 hours.

## CC Links

`/cc` is for fast copy-paste sharing. It immediately opens a live note editor and generates a simple 24-hour link such as `/cc/john92`. After 24 hours, cleanup deletes the underlying share so that simple names can be reused.

Regular code, document, link, bookmark, and note shares also get simple links such as `/s/ali92`. Logged-in regular shares do not auto-expire; guest regular shares expire after 24 hours. Password vault links intentionally use long high-entropy slugs and also never expire automatically.
