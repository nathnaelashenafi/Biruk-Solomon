# Testimonials, invitations and contact: setup

Browser (React, public keys only) -> Supabase Edge Functions (secrets live here) -> Postgres + Storage -> Telegram bot.

## 1. Database

```bash
npm i -g supabase            # or: npx supabase ...
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push             # applies supabase/migrations/20261101000000_testimonials_and_contact.sql
```

Creates the tables (all private, Row-Level Security on, no public policies), the `public_testimonials` view
(the only thing the website can read), the SQL functions, and the two storage buckets
(`testimonial-private`, `testimonial-public`).

## 2. Telegram bot

1. In Telegram open **@BotFather**, send `/newbot`, follow the steps, copy the **token**.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser
   and read `message.from.id`. That number is `TELEGRAM_ADMIN_USER_ID`. Do not share it publicly.
3. Make two random strings: `openssl rand -hex 32` (webhook secret) and again (cron secret).

## 3. Secrets (backend only)

Copy the backend block of `.env.example` into **supabase/.env** (git-ignored), fill it in, then:

```bash
supabase secrets set --env-file supabase/.env
```

| Variable                                                                                                                      | Where                                              | Purpose                     |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                                                                 | frontend `.env.local` + your deploy build settings | public, safe in the browser |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_USER_ID`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `ALLOWED_ORIGIN`, `PUBLIC_SITE_URL` | Supabase function secrets                          | never in the browser or Git |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                                                                                   | provided to functions automatically                | do not copy anywhere        |

## 4. Deploy the functions

```bash
supabase functions deploy --no-verify-jwt
```

`--no-verify-jwt` is intentional: visitors and Telegram have no Supabase login. Each function does its own checks
(Telegram: webhook secret + numeric admin ID; notify-retry: cron secret; public ones: validation + rate limits).

## 5. Register the webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://YOUR-PROJECT-REF.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -d 'commands=[{"command":"menu","description":"Open the menu"},{"command":"cancel","description":"Cancel"}]'
```

## 6. Frontend

Add the two `VITE_` values to `.env.local`, and to the build step of your GitHub Actions workflow
(`env:` block, from repository secrets or variables). They are public by design. Then merge the
App.jsx change from the instructions, `npm run build`, deploy.
The invitation page is `https://YOUR-SITE/#/testimonial?token=...` (hash route, so it works on GitHub Pages;
the token in the `#` part is never sent to any server or logged).

## 7. Retry undelivered Telegram notifications (recommended)

Enable the `pg_cron` and `pg_net` extensions, then:

```sql
select cron.schedule('notify-retry', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify-retry',
    headers := '{"x-cron-secret": "YOUR-CRON-SECRET"}'::jsonb);
$$);
```

It only re-sends; it cannot create a second inquiry or testimonial.

## 8. Testing checklist (do these with real credentials)

1. Message the bot from a different Telegram account: it must answer "This bot is private." and do nothing else.
2. From your account: /menu, Create Invitation, confirm. Open the link, check the form is prefilled.
3. Submit a testimonial (with and without a photo). The bot must notify you. Reload the link: "already been used".
4. Review shows full details and photos. Approve: the testimonial appears on the site without a rebuild.
5. Submit the contact form: you get "NEW CONTACT INQUIRY" in Telegram. Submit 6 times in an hour: the 6th is refused.
6. Wait over an hour on a fresh link: "expired". Cancel a link in the bot: "cancelled".

## 9. Automated tests

- `npm test` runs the validation tests (needs only Node).
- `tests/database.test.sh` tests the SQL (concurrency, expiry, permissions) against a local Postgres. Create these
  first: roles `anon`, `authenticated`, `service_role (bypassrls)`; `create schema storage;` and
  `create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`
  in a database called `t`, then apply the migration.

## 10. Retention (suggested, not automatic)

Rejected testimonials: delete after 90 days. Contact inquiries: delete after 12 months. Example:

```sql
delete from public.testimonials where status = 'rejected' and rejected_at < now() - interval '90 days';
delete from public.contact_inquiries where created_at < now() - interval '12 months';
```

(Also remove the matching files from the `testimonial-private` bucket.)

## Known limits

- Uploaded images are checked by real file content, type and size. They are **not** malware-scanned or re-encoded.
- An invitation link is not identity verification: anyone holding it can use it before it expires.
- Rate limits are fixed-window and keyed on a hash of the IP. Shared IPs share a limit; a determined attacker can rotate IPs.
- There is no web review page: review, photos, approve and reject happen in Telegram.
