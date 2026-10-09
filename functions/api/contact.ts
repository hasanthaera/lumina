// POST /api/contact: receives the enquiry form, checks spam protection,
// validates, and emails the owner. See design.md D2–D5.
//
// Two response modes:
// - `Accept: application/json` (enhancement script): JSON `{ ok, reason?, errors?, message? }`.
// - Plain form post (no script): 303 to /contact/thanks/ or a minimal HTML error page.
// Submitted values are never put in URLs.

import { site } from '../../src/config/site';
import {
  buildEnquiryEmail,
  FIELD_LABELS,
  FIELDS,
  validateEnquiry,
  type EnquiryErrors,
  type Field,
} from '../../src/lib/enquiry';
import { sendEnquiryEmail, type EmailEnv } from '../../src/lib/send-email';

export interface Env extends EmailEnv {
  TURNSTILE_SECRET_KEY?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const HONEYPOT_FIELD = 'company_website';
const TURNSTILE_FIELD = 'cf-turnstile-response';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const THANKS_PATH = '/contact/thanks/';

type Failure =
  | { reason: 'validation'; errors: EnquiryErrors }
  | { reason: 'challenge' }
  | { reason: 'delivery' }
  | { reason: 'bad-request' };

export const MESSAGES = {
  challenge: 'Please complete the "I am human" check and try again.',
  delivery: `Sorry, we could not send your enquiry just now. Please try again, or call us on ${site.phone} or email ${site.displayEmail}.`,
  'bad-request': 'Sorry, we could not read your enquiry. Please go back and try again.',
  validation: 'Please fix the following and try again.',
} as const;

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure(wantsJson, { reason: 'bad-request' });
  }
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };

  // Honeypot: pretend it worked so bots get no signal.
  if (field(HONEYPOT_FIELD).trim() !== '') {
    return success(wantsJson);
  }

  const human = await verifyTurnstile(
    env.TURNSTILE_SECRET_KEY,
    field(TURNSTILE_FIELD),
    request.headers.get('CF-Connecting-IP'),
  );
  if (!human) {
    return failure(wantsJson, { reason: 'challenge' });
  }

  const input = Object.fromEntries(FIELDS.map((name) => [name, field(name)])) as Record<Field, string>;
  const result = validateEnquiry(input);
  if (!result.ok) {
    return failure(wantsJson, { reason: 'validation', errors: result.errors });
  }

  const email = buildEnquiryEmail(result.values, {
    receivedAt: new Date(),
    sourcePage: sourcePage(request),
  });
  const sent = await sendEnquiryEmail(env, email);
  if (!sent.ok) {
    // Visible in the Cloudflare Pages function logs. No customer details logged.
    console.error(`Enquiry delivery failed: ${sent.error}`);
    return failure(wantsJson, { reason: 'delivery' });
  }

  return success(wantsJson);
}

async function verifyTurnstile(secret: string | undefined, token: string, ip: string | null) {
  if (!secret) {
    console.error('Enquiry rejected: TURNSTILE_SECRET_KEY is not configured.');
    return false;
  }
  if (!token) return false;

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  try {
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error(`Turnstile verification failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/** Path (and query) of the page the form was posted from, same-origin only. */
function sourcePage(request: Request): string {
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      const ref = new URL(referer);
      if (ref.origin === new URL(request.url).origin) return ref.pathname + ref.search;
    } catch {
      // ignore malformed Referer
    }
  }
  return '/contact/';
}

function success(wantsJson: boolean): Response {
  if (wantsJson) return Response.json({ ok: true });
  return new Response(null, { status: 303, headers: { Location: THANKS_PATH } });
}

const STATUS: Record<Failure['reason'], number> = {
  validation: 422,
  challenge: 403,
  delivery: 502,
  'bad-request': 400,
};

function failure(wantsJson: boolean, f: Failure): Response {
  const status = STATUS[f.reason];
  const message = MESSAGES[f.reason];
  if (wantsJson) {
    return Response.json(
      { ok: false, reason: f.reason, message, ...(f.reason === 'validation' ? { errors: f.errors } : {}) },
      { status },
    );
  }
  return new Response(errorPage(f, message), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Minimal no-script fallback page. Only our own messages are rendered, never submitted values. */
function errorPage(f: Failure, message: string): string {
  const items =
    f.reason === 'validation'
      ? `<ul>${Object.entries(f.errors)
          .map(([name, error]) => `<li><strong>${escapeHtml(FIELD_LABELS[name as Field])}:</strong> ${escapeHtml(error)}</li>`)
          .join('')}</ul>`
      : '';
  const contact =
    f.reason === 'delivery'
      ? `<p>Phone: <a href="tel:${escapeHtml(site.phoneHref)}">${escapeHtml(site.phone)}</a><br>Email: <a href="mailto:${escapeHtml(site.displayEmail)}">${escapeHtml(site.displayEmail)}</a></p>`
      : '';
  return `<!doctype html>
<html lang="${site.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>There was a problem with your enquiry | ${escapeHtml(site.name)}</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.6;color:#1d2621;max-width:40rem;margin:2rem auto;padding:0 1rem}a{color:#2d6a3e}h1{line-height:1.2}</style>
</head>
<body>
<main>
<h1>There was a problem with your enquiry</h1>
<p>${escapeHtml(message)}</p>
${items}
${contact}
<p>Use your browser's <strong>Back</strong> button to return to the form with your details still filled in, or <a href="/contact/">go back to the Contact us form</a>.</p>
</main>
</body>
</html>`;
}
