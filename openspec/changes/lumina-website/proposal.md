# Proposal

## Why

Lumina, a small handyman business, has no web presence. Prospective customers need a place to
see what Lumina does (landscaping, handyman work, paving/decking) and a simple way to ask for a
quote, with every enquiry landing straight in the owner's email inbox. A static site on
Cloudflare Pages gives this at near-zero hosting cost with no server to maintain.

## What Changes

- Create a new, fast, mobile-friendly marketing website for **Lumina**, hosted on
  **Cloudflare Pages**.
- Add a **Home** page introducing the business, summarising the three services, and offering a
  clear "Get a quote" / "Contact us" call to action.
- Add a **Services** overview plus one page per service:
  - **Landscaping**
  - **Handyman**
  - **Paving / Decking**
- Add a **Contact us** page with an enquiry form (name, email, phone, service of interest,
  message). A valid submission is **emailed to the business owner's address**, with the
  customer's email set as the reply-to, so the owner can just hit "Reply".
- Protect the form against spam (bot challenge + hidden honeypot field) and validate input on
  the server; show the customer a clear success or failure message.
- Keep the business details (name, phone, display email, service area) and the owner's
  destination email in **configuration**, not hard-coded in pages; the destination email and
  any email-provider key are kept as **secrets**, never shipped to the browser.
- Shared site layout: header with navigation, footer with contact details, basic SEO metadata
  and a 404 page.

Non-goals (this change): online booking or payments, a customer login, a CMS/blog, storing
enquiries in a database, a quote calculator, and multi-language content.

## Capabilities

### New Capabilities
- `marketing-site`: The public Lumina website — shared layout and navigation, Home page,
  Services overview and the Landscaping, Handyman and Paving/Decking pages, 404 page,
  responsive/accessible presentation and basic SEO metadata.
- `contact-enquiry`: The Contact us page and enquiry form — field validation, spam protection,
  delivery of each valid enquiry to the owner's email address, and the success/failure
  feedback shown to the customer.

### Modified Capabilities
<!-- None. This is a new project. -->

## Impact

- **New project** in this repository: a static site plus a single serverless form handler
  deployed together on Cloudflare Pages.
- **External services:** Cloudflare Pages (hosting + Functions), Cloudflare Turnstile (bot
  challenge), and a transactional email provider for sending enquiries (see design.md).
- **Configuration/secrets:** owner destination email, sender address, email-provider API key,
  Turnstile site/secret keys — set in the Cloudflare Pages project settings.
- **DNS:** the business domain is expected to be on Cloudflare so the Pages site and the email
  sender's domain verification records can be added there.
