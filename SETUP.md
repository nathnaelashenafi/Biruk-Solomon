# Supabase, contact email, testimonials and deployment

The browser uses only the public Supabase URL and publishable/anon key. Supabase Edge Functions
hold the service-role, Telegram and email-provider credentials. Private data is accessed through
those functions; the website can read only approved testimonials and public videos.

## 1. Link and migrate the database

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push --linked
```

This applies every migration in `supabase/migrations`, including the contact phone, portfolio
videos, and idempotent email-delivery changes. It creates private tables with RLS enabled, the
public views, database functions, and the `testimonial-private` and `testimonial-public` buckets.

To preview changes without applying them, use `npx supabase db push --linked --dry-run`.

## 2. Configure email delivery

Contact submissions are saved in Postgres and emailed to `biruksolomon701@gmail.com` through
Resend. Create a Resend account, verify a sender domain, and create an API key. Do not use the
recipient's Gmail address as the sender unless it is a domain Resend has verified.

Set these as Supabase function secrets:

| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API credential; backend only |
| `CONTACT_EMAIL_FROM` | Verified sender, e.g. `Biruk Solomon <mail@your-verified-domain>` |
| `ALLOWED_ORIGIN` | Exact browser origins, comma-separated: `https://nathnaelashenafi.github.io,http://localhost:5173` |
| `PUBLIC_SITE_URL` | Invitation link base: `https://nathnaelashenafi.github.io/Biruk-Solomon` |

Email is not reported as sent unless Resend accepts it. The API key and sender must be configured
before the contact form can report email success. Delivery failures are logged and can be retried
using the same idempotency key; Resend receives an idempotency key so network retries do not send
duplicate messages.

## 3. Configure the Telegram bot

1. In Telegram, open **@BotFather**, send `/newbot`, and copy the token.
2. Send a message to the bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read
   `message.from.id`. Use this numeric value for `TELEGRAM_ADMIN_USER_ID`; do not share it.
3. Generate two random strings with `openssl rand -hex 32`, one for `TELEGRAM_WEBHOOK_SECRET` and
   one for `CRON_SECRET`.

Put these values, plus the email settings above, in the git-ignored `supabase/.env`. Use
`.env.example` as the key list, replacing all placeholders. Then set the Edge Function secrets:

```bash
npx supabase secrets set --env-file supabase/.env
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically; do
not copy them into the frontend. Never put Telegram credentials, the service-role key, or the
Resend API key in a `VITE_` variable.

## 4. Deploy Supabase functions

Apply migrations before deploying functions that use the new columns and SQL function:

```bash
npx supabase db push --linked
npx supabase functions deploy --no-verify-jwt
```

`supabase/config.toml` records the project configuration and disables gateway JWT verification
for these functions because public visitors and Telegram do not sign in to Supabase. Each function
enforces its own checks: Telegram's webhook secret and numeric admin ID, the cron secret, exact
CORS origins, input validation, and rate limits. Keep the explicit `--no-verify-jwt` flag when
deploying so the deployed setting remains unambiguous.

Register or update the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://YOUR-PROJECT-REF.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -d 'commands=[{"command":"menu","description":"Open the menu"},{"command":"cancel","description":"Cancel"}]'
```

## 5. Frontend and GitHub Pages

Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the ignored frontend `.env.local` for local
development. These two public values must also be set as **GitHub repository variables** with the
same names; the deploy workflow injects them into the Vite production build.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/`. Local Vite uses `/` as its base path; production builds use
`/Biruk-Solomon/`. Test the production bundle locally with:

```bash
npm run build
npm run preview
```

GitHub Pages is deployed by `.github/workflows/deploy.yml` on pushes to `master` or by manual
workflow dispatch. Invitation links use a hash route (`/#/testimonial?token=...`), so refreshing
the invitation page does not require a GitHub Pages rewrite rule. The token after `#` is not sent
in the initial page request.

## 6. Retry failed notifications (recommended)

The retry function handles both failed Telegram notifications and contact email delivery. Enable
`pg_cron` and `pg_net`, then schedule it:

```sql
select cron.schedule('notify-retry', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify-retry',
    headers := '{"x-cron-secret": "YOUR-CRON-SECRET"}'::jsonb);
$$);
```

Retries only update existing inquiry/testimonial rows. Email attempts are capped and an email
already accepted by Resend is not resent for the same inquiry.

## 7. End-to-end checks

1. Submit a contact message locally and verify it is saved in `contact_inquiries`, arrives at
   Biruk's email, and sends a Telegram notification. Retry the same submission after a network
   interruption; it must not create another inquiry.
2. Submit with Resend unconfigured or unavailable. The form must show a delivery error, not
   success; the saved inquiry can be retried after configuration is corrected.
3. In Telegram, use `/menu` -> **Create Invitation**. Open the link, submit a testimonial with and
   without a photo, and verify the link reports used if opened again.
4. Review the testimonial in Telegram and approve it. It should appear on the website without a
   rebuild; pending and rejected testimonials should remain private.
5. Test the Telegram admin flow from the configured admin account and verify a different account
   receives “This bot is private.”
6. Add/remove a video through Telegram and verify the public site updates. Existing locally
   configured projects remain as a fallback if the Supabase video view cannot be read.
7. Check the deployed site at `https://nathnaelashenafi.github.io/Biruk-Solomon/`, including the
   invitation hash route and refresh behavior.

## 8. Automated tests

- `npm test` runs validation and video-link tests using Node.
- `npm run lint` checks JavaScript/JSX.
- `npm run build` checks the production Vite bundle.
- `tests/database.test.sh` exercises SQL concurrency, expiry, authorization, and rate limiting
  against a local Postgres database. It expects Supabase-style `anon`, `authenticated`, and
  `service_role` roles plus a `storage.buckets` stub; apply all migrations before running it.

## Known limits

- Uploaded images are checked by file content, type, and size; they are not malware-scanned or
  re-encoded.
- An invitation link is not identity verification: anyone holding it can use it once before it
  expires.
- Rate limits are fixed-window and keyed on a hash of the IP. Shared IPs share a limit; clients
  that can rotate IPs can evade per-IP limits.
- There is no web review page; review, photos, approval, and rejection happen in Telegram.
- Rejected testimonial files and old contact inquiries require manual retention cleanup.

## Portfolio videos

Videos are stored in `portfolio_videos` and read through the public `public_videos` view. In
Telegram, use **/menu** -> **Add Video** or **Manage Videos**. Only public/unlisted YouTube videos
and public Vimeo videos are supported; thumbnails are selected from YouTube/Vimeo image hosts.
