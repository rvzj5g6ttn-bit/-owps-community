# OWPS Community

A small privacy-minimal community website with exactly two features:

1. Share NOC code + Ontario working region + OWPS EOI score.
2. Check how many profiles have been shared for a NOC/region and view their score distribution.

## Free setup

- Hosting: Vercel Free
- Database: Supabase Free
- Custom domain: not required; use the free `*.vercel.app` address

## Connect Supabase

1. Create a free Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. In Supabase: Project Settings -> API, copy the Project URL and anon public key.
4. Put those values in `config.js`.
5. Deploy this folder to Vercel.

Until Supabase is connected, the website runs in local demo mode using browser localStorage. Demo data is visible only on that device/browser.

## Privacy / safety choices

- No names, emails, phone numbers, passwords, or accounts.
- Only NOC code, broad region, EOI score, and automatic timestamp are stored.
- Server/database constraints reject malformed NOC codes and out-of-range scores.
- RLS allows anonymous read/insert only; no anonymous update/delete.
- HTTPS is provided automatically by Vercel.

For a larger public community, add bot/rate-limit protection before promoting it widely.
