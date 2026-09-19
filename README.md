# OWPS Community

A privacy-minimal community website with two main features:

1. Calculate an estimated OWPS EOI score.
2. Share NOC code + Ontario working region + OWPS EOI score and view community score data.

## Architecture

- Frontend hosting: Firebase Hosting
- Database: Supabase
- Secure submissions: Supabase Edge Function (`submit-score`)
- Source control: GitHub (optional for deployment workflow)

## Connect Supabase

1. Create/open your Supabase project.
2. Open the Supabase SQL Editor and run `supabase.sql`.
3. In Supabase Project Settings -> API, copy the Project URL and publishable/anon key.
4. Put those public values in `config.js`.
5. Deploy `supabase/functions/submit-score` as a Supabase Edge Function.
6. Set the Edge Function secret `RATE_LIMIT_SALT` to a long random value. Never put this secret in `config.js` or GitHub.
7. Deploy the frontend files with Firebase Hosting.

Until Supabase is connected, the website can use its browser-local demo behavior where supported. Local demo data is visible only on that device/browser.

## Privacy and security

- No names, emails, phone numbers, passwords, or user accounts are required for community score submissions.
- Only NOC code, broad Ontario region, EOI score, and automatic timestamp are stored.
- Database constraints reject malformed NOC codes and scores outside 1–130.
- Row Level Security allows public read access to community score data.
- Browser/anonymous roles cannot directly insert, update, or delete score records.
- New submissions go through the `submit-score` Edge Function, which validates input server-side and applies rate limiting.
- The Edge Function accepts production requests only from `https://owpsscoretracker.com` and `https://www.owpsscoretracker.com`, plus configured localhost development origins.
- The Supabase service-role key must remain server-side and must never be placed in `config.js`, frontend JavaScript, or GitHub.
- The publishable/anon key in `config.js` is intended for browser use. Security relies on RLS and server-side validation, not hiding that key.
- Firebase Hosting provides HTTPS for the deployed frontend.

## Security deployment checklist

Whenever the security SQL or Edge Function changes:

1. Re-run the current `supabase.sql` in the Supabase SQL Editor.
2. Redeploy `supabase/functions/submit-score`.
3. Confirm `RATE_LIMIT_SALT` is configured as a Supabase Edge Function secret.
4. Deploy the frontend with Firebase Hosting.
5. Test one normal submission and verify that a direct anonymous database insert is rejected.
