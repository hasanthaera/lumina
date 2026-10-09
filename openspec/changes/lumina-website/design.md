# Design

## Context

Empty repository; nothing exists yet. The site is a handful of mostly static pages plus one
dynamic endpoint (the enquiry form). Hosting is fixed to **Cloudflare Pages**, which serves
static assets from its CDN and runs server-side code as **Pages Functions** (files under
`/functions`, deployed with the site). Requirements are in `specs/marketing-site/spec.md` and
`specs/contact-enquiry/spec.md`.

## Goals / Non-Goals

**Goals:**
- Static pages with no runtime cost; one small function for the form.
- Enquiry emails delivered reliably to one owner address, with reply-to the customer.
- All business details and secrets in config, so the owner's details can be changed without
  touching page code.
- Deployable from Git with Cloudflare Pages' built-in CI (push to `main` → production,
  other branches → preview URLs).

**Non-Goals:**
- Storing enquiries (no database/KV). Email is the only record.
- Sending an auto-reply/confirmation email to the customer.
- Analytics beyond what Cloudflare Web Analytics provides if the owner turns it on.

## Decisions

**D1 — Astro in static output mode for the pages.**
Astro gives reusable layout/components (header, footer, service card) and builds to plain
HTML/CSS with zero JavaScript by default, which Cloudflare Pages serves directly.
`@astrojs/sitemap` covers the sitemap requirement. *Alternatives:* hand-written HTML — no
shared layout, so header/footer/config would be copied across pages; Next.js — far heavier
than a brochure site needs, and needs an adapter for Pages.

**D2 — Form handler as a Pages Function at `functions/api/contact.ts`.**
The form posts (`method="POST"`, `application/x-www-form-urlencoded`) to `/api/contact`. The
function validates, verifies the bot challenge and sends the email. It has two response modes:
- **Enhanced (primary):** a small script submits the form with `fetch` and
  `Accept: application/json`; the function returns JSON (`{ ok }` or `{ ok: false, errors }`),
  and the script shows the confirmation or inline field errors. The values never leave the form,
  so they are kept automatically.
- **Fallback (script failed to load):** a normal form post. Success → **303 redirect** to
  `/contact/thanks/`. Failure → a minimal HTML error page from the function listing what to fix,
  with a "Go back" link (browsers keep entered values on back navigation).
Entered values are never put in redirect query strings, so no personal data ends up in URLs or
logs. *Alternative:* a separate Cloudflare Worker — extra deployable and routing for no gain.

**D3 — Validation in a shared, pure module `src/lib/enquiry.ts`.**
One `validateEnquiry(input)` returns `{ ok, values, errors }` and is used by the function (and
optionally by the browser script for instant feedback). Being pure, it is unit-tested with
Vitest. Inputs are trimmed; the phone/email/length rules come from the spec table.

**D4 — Cloudflare Turnstile for the bot challenge, plus a honeypot.**
Turnstile is free, native to Cloudflare, and verified server-side with a `fetch` to the
`siteverify` endpoint using `TURNSTILE_SECRET_KEY`. The honeypot is a visually hidden
`company_website` input with `tabindex="-1"` and `autocomplete="off"`; if filled, the function
returns the normal success response without sending. *Alternative:* reCAPTCHA — third-party
tracking and worse UX.

**D5 — Send email through Resend's HTTP API.**
Pages Functions can't open SMTP connections, so sending uses an HTTPS email API. Resend has a
simple JSON API, a free tier well above a small business's enquiry volume, supports
`reply_to`, and its domain verification (SPF/DKIM DNS records) is easy to add in Cloudflare
DNS. The function calls `POST https://api.resend.com/emails` with `RESEND_API_KEY`, sending
**from** a verified address on the business domain (e.g. `enquiries@<domain>`) **to**
`CONTACT_TO_EMAIL`, with `reply_to` = the customer's email. The body is sent as **plain text
only** (`text`, no `html`), which removes any HTML-injection risk from customer input; header
fields (subject, reply-to) are stripped of CR/LF to prevent header injection.
The email-sending call sits behind a small `sendEnquiryEmail(env, enquiry)` function so the
provider can be swapped without touching validation or the handler.
*Alternatives:* Cloudflare Email Routing's `send_email` binding — only delivers to verified
destination addresses (fine here) but is a Workers binding and not straightforward from Pages
Functions; MailChannels — its free Cloudflare integration has been discontinued; Formspree-style
form services — adds a third-party dependency and a monthly limit for something this simple.

**D6 — Configuration split: public site config vs server secrets.**
- `src/config/site.ts` — business name, phone, display email, service area, time zone,
  service list (slug + label + summary). Public; imported by pages.
- Cloudflare Pages environment variables/secrets (Production and Preview):
  `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` (secrets)
  and `PUBLIC_TURNSTILE_SITE_KEY` (build-time, public). Local development uses `.dev.vars`
  (git-ignored) with Turnstile's published test keys.
The destination email lives only in the secret, keeping it out of the page and network traffic.

**D7 — Plain CSS with custom properties; no UI framework.**
A small design-token stylesheet (colours, spacing, type scale) plus component styles is enough
and keeps pages light. A mobile nav toggle is the only required script (a `<details>`/button
pattern that also works by keyboard).

**D8 — Testing.**
- Vitest unit tests for `validateEnquiry`, email composition (subject, reply-to, plain-text
  body, CR/LF stripping) and the handler (with `fetch` to Turnstile/Resend mocked): success,
  validation error, honeypot, failed challenge, provider failure.
- Local end-to-end check with `wrangler pages dev` against the built site using Turnstile test
  keys and a Resend test send.
- Lighthouse/axe pass on key pages for the accessibility and SEO requirements.

## Risks / Trade-offs

- [Email provider outage or a misconfigured key loses enquiries — there is no stored copy]
  → Show the error message with phone/email so the customer can still reach the owner; log
  failures (visible in Cloudflare's function logs); send a test enquiry after every deploy.
- [Enquiry emails land in the owner's spam folder] → Send from a verified domain with SPF and
  DKIM set up, plain-text body, consistent sender; ask the owner to mark the first one "not spam".
- [Turnstile blocks some genuine users] → Use Turnstile's managed (usually invisible) mode and
  keep phone/email on the page as an alternative.
- [Domain not on Cloudflare] → Site still works on the `*.pages.dev` URL; Resend domain
  verification records can be added at any DNS host.
- [Resend dependency] → Isolated behind `sendEnquiryEmail`, so switching provider is a
  one-file change.

## Migration Plan

New site, so no migration. Deploy steps:
1. Create the Cloudflare Pages project connected to the Git repo (build `npm run build`,
   output `dist`).
2. Create the Turnstile widget for the domain(s), verify the sending domain in Resend, and add
   the env vars/secrets to the Pages project (Production and Preview).
3. Attach the custom domain in Pages; confirm HTTPS.
4. Send a test enquiry on the production URL and confirm it arrives at the owner's inbox.
Rollback: re-deploy a previous deployment from the Pages dashboard (one click).

## Open Questions

- The business domain name, owner destination email, sender address, phone number, display
  email and service area — needed as config values before go-live; placeholders are used until
  then.
- Logo, brand colours and photos of past work — placeholders until supplied.
- Spelling/locale (e.g. Australian English, phone number format) for page copy.
