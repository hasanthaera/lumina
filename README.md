# Lumina website

Marketing site for Lumina (landscaping, handyman, paving / decking) with a Contact us form that
emails each enquiry to the owner. Static pages are built with [Astro](https://astro.build); the
form is handled by a Cloudflare Pages Function. Hosting is Cloudflare Pages.

```
src/config/site.ts        Business details and services (edit this to change the site)
src/pages/                Pages: /, /services/, /services/<slug>/, /contact/, 404
src/lib/enquiry.ts        Form validation and email composition (shared, unit-tested)
src/lib/send-email.ts     Sends the email through Resend
functions/api/contact.ts  POST /api/contact form handler (Pages Function)
tests/                    Vitest tests
```

## Local setup

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
npm run build
npm run preview
```

Then open <http://localhost:8788>. `npm run preview` runs the built site and the form handler
together with `wrangler pages dev`, which is the closest match to production.
`npm run dev` gives faster page editing with hot reload, but the form handler does not run there.

| Script | What it does |
|---|---|
| `npm run dev` | Astro dev server (pages only) |
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve `dist/` plus `functions/` locally on port 8788 |
| `npm test` | Unit tests; the built-site checks also run when `dist/` exists |
| `npm run check` | Type-check Astro and TypeScript files |

The example files use Cloudflare Turnstile's published **test keys**, which always pass. To try
a failing spam check, set `TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AA` in
`.dev.vars`. To send real emails locally, put a Resend API key and a verified sender in
`.dev.vars`.

## Configuration and secrets

| Name | Where | Secret? | Purpose |
|---|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | `.env` / Pages env var | No (in page) | Turnstile widget site key, read at **build** time. The build fails without it. |
| `TURNSTILE_SECRET_KEY` | `.dev.vars` / Pages secret | Yes | Verifies the Turnstile token |
| `RESEND_API_KEY` | `.dev.vars` / Pages secret | Yes | Resend API key (sending access only) |
| `CONTACT_FROM_EMAIL` | `.dev.vars` / Pages secret | Yes | Sender, on the verified domain, e.g. `Lumina Website <enquiries@yourdomain>` |
| `CONTACT_TO_EMAIL` | `.dev.vars` / Pages secret | Yes | Owner's inbox for enquiries. Never sent to the browser. |

`.env` and `.dev.vars` are git-ignored. Never commit real keys.

## Editing business details

Everything visitors see about the business comes from `src/config/site.ts`:

- `name`, `tagline`, `phone` (as displayed) and `phoneHref` (international format for `tel:`)
- `displayEmail`: the public address shown on the site. This is not where enquiries go;
  that is `CONTACT_TO_EMAIL`.
- `serviceArea`, `timeZone` (for enquiry timestamps) and `url` (the live domain, used for
  canonical links, the sitemap and structured data)
- `services`: label, summary, description and typical jobs for each service. Keep the three
  slugs (`landscaping`, `handyman`, `paving-decking`); they are the page URLs and the contact
  form values.

Values marked `PLACEHOLDER` (domain, phone, display email, service area, time zone) must be
replaced before go-live. Commit and push to rebuild.

## Deploying to Cloudflare Pages

1. **Create the project.** In Cloudflare: Workers & Pages → Create → Pages → connect this Git
   repository. Use build command `npm run build` and output directory `dist`. The Node version
   is pinned by `.node-version`. Pushing to `main` deploys production; other branches get
   preview URLs.
2. **Turnstile.** Create a widget (Managed mode) for the production domain and `<project>.pages.dev`.
   Set `PUBLIC_TURNSTILE_SITE_KEY` as a plain variable and `TURNSTILE_SECRET_KEY` as a secret.
3. **Resend.** Add and verify the business domain in Resend by adding its SPF and DKIM records
   in Cloudflare DNS, then create an API key with sending access. Set `RESEND_API_KEY`,
   `CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` as secrets.
4. Set the variables in step 2 and 3 for **both Production and Preview**, then redeploy.
5. **Custom domain.** In the Pages project → Custom domains, add the domain and confirm HTTPS.
   Update `url` in `src/config/site.ts` to match.
6. **Test.** Send a test enquiry on the live site. Check it arrives (not in spam), and that
   replying goes to the address you entered. Mark the first one "Not spam" if needed.

Form-handler errors (e.g. a rejected Resend key) appear in the Pages project's function logs.
Customer details are not logged.

### Rollback

In the Pages project → Deployments, open a previous successful deployment and choose
**Rollback to this deployment**.
