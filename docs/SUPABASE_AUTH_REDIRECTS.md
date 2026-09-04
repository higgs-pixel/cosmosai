# Supabase Authentication Redirects

COSMOS AI completes Google OAuth and email verification through the server-side callback at `/auth/callback`. The callback exchanges Supabase's authorization code, writes the COSMOS session cookies, and returns the user to an internal application route.

## Supabase Dashboard Settings

Open **Supabase Dashboard > Authentication > URL Configuration**.

### Site URL

Set the Site URL to the production COSMOS AI origin:

```text
https://your-production-domain.com
```

Replace the example with the actual custom domain or stable Vercel production domain. Do not use a localhost or preview URL as the production Site URL.

### Redirect URLs

Allow these callback URLs:

```text
https://your-production-domain.com/auth/callback
http://localhost:3000/auth/callback
```

The application adds the internal `next=/account` query parameter at runtime. Supabase matches the configured callback origin and path.

## Google Provider

Keep the existing Google provider enabled in **Authentication > Providers > Google**. The browser starts OAuth with:

```text
{current-origin}/auth/callback?next=/account
```

This means local development returns to localhost and production returns to the active production origin without hardcoded deployment URLs.

## Email Verification

Email signup sends users back to `/auth/callback?next=/account&flow=email`. When the PKCE verifier is available, the callback signs the user in and redirects to `/account`, where COSMOS confirms that the email was verified. If verification succeeds in another browser or after the short-lived verifier expires, the user is returned to `/login` with a prompt to sign in.

## Vercel Preview Deployments

Preview domains are not enabled automatically. Add a preview callback only when that deployment is intentionally used for authentication testing. Prefer an exact preview URL. A Supabase wildcard redirect should only be used when the team has reviewed the security implications and access controls for preview deployments.

## Environment Variables

Authentication uses only the browser-safe project values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Never expose or add a Supabase service-role key to the client or this redirect configuration.
