# Tasks

## 1. Project setup

- [x] 1.1 Scaffold an Astro project (static output) in the repo root with TypeScript strict, and verify `npm run build` produces `dist/index.html`
- [x] 1.2 Add dev dependencies `wrangler`, `vitest`, `@astrojs/sitemap`, and verify `npx wrangler --version` and `npx vitest --version` run
- [x] 1.3 Add npm scripts `dev`, `build`, `preview` (`wrangler pages dev dist`), `test` (`vitest run`), and verify each runs without error on the empty project
- [x] 1.4 Add `.gitignore` entries (`node_modules`, `dist`, `.wrangler`, `.dev.vars`) and a committed `.dev.vars.example` listing `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` with Turnstile's published test secret; verify `git status` does not show `.dev.vars`

## 2. Site configuration, layout and styling

- [x] 2.1 Create `src/config/site.ts` with placeholder business name "Lumina", phone, display email, service area, time zone, site URL, and the three services (slug, label, summary, typical jobs); verify a Vitest test asserts the three slugs `landscaping`, `handyman`, `paving-decking`
- [x] 2.2 Create `src/styles/` design tokens (colours, spacing, type scale, focus ring) and base styles; verify text/background token pairs meet 4.5:1 contrast (document the ratios in a comment)
- [x] 2.3 Build `BaseLayout.astro` with `<head>` SEO props (title, description, Open Graph, canonical), header, nav and footer rendered from `site.ts`; verify the built Home page contains a tel: link and a mailto: link in the footer
- [x] 2.4 Implement the responsive nav: menu button below a breakpoint, keyboard/touch operable, `aria-expanded` kept in sync, current page marked with `aria-current="page"`; verify by keyboard-only use at 375px and desktop widths

## 3. Marketing pages

- [x] 3.1 Build the Home page (`/`): intro/hero, three service cards linking to each service page, and a "Get a quote" call to action linking to `/contact/`; verify the links in the built HTML
- [x] 3.2 Build `/services/` listing all services from `site.ts`, each linking to its page; verify all three links resolve in `npm run preview`
- [x] 3.3 Build the three service pages (`/services/landscaping/`, `/services/handyman/`, `/services/paving-decking/`) from one template fed by `site.ts`, each ending with a call to action to `/contact/?service=<slug>`; verify each page builds with a unique title and correct CTA link
- [x] 3.4 Add `404.astro` using the shared layout with links to Home and Contact us; verify `npm run preview` returns status 404 with that page for `/does-not-exist`
- [ ] 3.5 Configure `@astrojs/sitemap` and add `robots.txt` referencing it; add LocalBusiness JSON-LD on Home from `site.ts`; verify `dist/sitemap-index.xml` lists Home, Services, three service pages and Contact us, and the JSON-LD passes a schema validator
- [x] 3.6 Write placeholder copy for every page and mark unknown business details clearly as placeholders; verify no page has an empty heading or lorem ipsum

## 4. Enquiry validation and email composition

- [x] 4.1 Implement `src/lib/enquiry.ts` `validateEnquiry(input)` per the spec field table (trim, required, lengths, email format, phone characters, service enum) returning `{ ok, values, errors }`; verify with Vitest cases for each rule, including boundary lengths
- [x] 4.2 Implement `buildEnquiryEmail(enquiry, meta)` returning `{ subject, replyTo, text }` with subject `New enquiry: {service} – {name}`, plain-text body with all fields, received time in the configured time zone and source page, and CR/LF stripped from header values; verify with Vitest (including the `<script>` message case and a name containing a newline)
- [x] 4.3 Implement `sendEnquiryEmail(env, email)` calling the Resend API (`from` `CONTACT_FROM_EMAIL`, `to` `CONTACT_TO_EMAIL`, `reply_to`, `text` only) and returning success/failure without throwing; verify with Vitest using a mocked `fetch` for 200, 4xx and network-error responses

## 5. Contact page and form handler

- [x] 5.1 Build `/contact/` with the business contact details, the labelled form fields, a visually hidden honeypot `company_website` field, and the Turnstile widget using `PUBLIC_TURNSTILE_SITE_KEY`; verify the form posts to `/api/contact` and every input has an associated `<label>`
- [x] 5.2 Pre-select the service from the `?service=` query parameter (known slugs only); verify `/contact/?service=handyman` selects Handyman and `?service=plumbing` selects nothing
- [x] 5.3 Implement `functions/api/contact.ts` (`onRequestPost`): parse form data, honeypot → success without sending, verify Turnstile token via `siteverify`, validate, build and send the email; respond JSON when `Accept: application/json`, otherwise 303 to `/contact/thanks/` on success or a minimal HTML error page on failure; never put submitted values in URLs; verify with Vitest handler tests (mocked `fetch`) for success, invalid field, honeypot, failed challenge and provider failure in both response modes
- [x] 5.4 Build `/contact/thanks/` confirmation page; verify it is excluded from the sitemap and has `noindex`
- [x] 5.5 Add the progressive-enhancement script: submit via `fetch`, show inline field errors / confirmation / delivery-failure message with phone and display email, keep entered values, disable the button while sending, and reset Turnstile after a failed attempt; verify manually in `npm run preview` and that the form still submits with the script disabled
- [ ] 5.6 Local end-to-end check: put Turnstile test keys and a Resend key in `.dev.vars`, run `npm run build && npm run preview`, submit a real enquiry and confirm the email arrives with the correct subject, Reply-To and body, and that the destination address does not appear in the page source or responses

## 6. Deployment and go-live checks

- [x] 6.1 Write `README.md` covering local setup, env vars/secrets, how to edit `site.ts`, and the deploy/rollback steps from design.md; verify a fresh clone can follow it to `npm run preview`
- [ ] 6.2 Create the Cloudflare Pages project from the Git repo (build `npm run build`, output `dist`, Node version pinned), set Production and Preview env vars/secrets, and verify a preview deployment builds and serves
- [ ] 6.3 Set up the Turnstile widget for the production domain and `*.pages.dev`, verify the sending domain in Resend (SPF/DKIM in DNS), and attach the custom domain; verify HTTPS works and Resend shows the domain as verified
- [ ] 6.4 Run Lighthouse and axe on Home, a service page and Contact us on the production URL; verify Accessibility and SEO scores ≥ 95 and no axe critical issues
- [ ] 6.5 Send a test enquiry on production and confirm it reaches the owner's inbox (not spam) and that replying goes to the customer address
