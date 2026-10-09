import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost, type Env } from '../functions/api/contact';
import { site } from '../src/config/site';

const env: Env = {
  RESEND_API_KEY: 're_test',
  CONTACT_FROM_EMAIL: 'Lumina Website <enquiries@lumina.example>',
  CONTACT_TO_EMAIL: 'owner-secret@lumina.example',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
};

const validFields = {
  name: 'Jane Citizen',
  email: 'jane@example.com',
  phone: '0400 000 000',
  service: 'landscaping',
  message: 'Please quote for a new lawn.',
  'cf-turnstile-response': 'token-ok',
};

type Mode = 'json' | 'form';

function makeRequest(fields: Record<string, string>, mode: Mode) {
  return new Request('https://lumina.example/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: mode === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
      Referer: 'https://lumina.example/contact/?service=landscaping',
      'CF-Connecting-IP': '203.0.113.7',
    },
    body: new URLSearchParams(fields).toString(),
  });
}

let turnstileOk: boolean;
let resend: () => Response | Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;

const resendCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).startsWith('https://api.resend.com'));
const turnstileCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes('challenges.cloudflare.com'));

beforeEach(() => {
  turnstileOk = true;
  resend = () => Response.json({ id: 'email_1' });
  fetchMock = vi.fn(async (url: string | URL) => {
    if (String(url).includes('challenges.cloudflare.com')) {
      return Response.json({ success: turnstileOk });
    }
    if (String(url).startsWith('https://api.resend.com')) return resend();
    throw new Error(`Unexpected fetch ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const post = (fields: Record<string, string>, mode: Mode) =>
  onRequestPost({ request: makeRequest(fields, mode), env });

describe('POST /api/contact', () => {
  describe('success', () => {
    it('sends the email and returns JSON ok', async () => {
      const res = await post(validFields, 'json');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      expect(resendCalls()).toHaveLength(1);
      const body = JSON.parse(resendCalls()[0]![1].body as string);
      expect(body.to).toEqual(['owner-secret@lumina.example']);
      expect(body.reply_to).toBe('jane@example.com');
      expect(body.subject).toBe('New enquiry: Landscaping – Jane Citizen');
      expect(body.text).toContain('Sent from: /contact/?service=landscaping');
      expect(body.html).toBeUndefined();
    });

    it('verifies the Turnstile token with the secret and client IP', async () => {
      await post(validFields, 'json');
      const sent = turnstileCalls()[0]![1].body as FormData;
      expect(sent.get('secret')).toBe('turnstile-secret');
      expect(sent.get('response')).toBe('token-ok');
      expect(sent.get('remoteip')).toBe('203.0.113.7');
    });

    it('redirects a plain form post to the thank-you page without values in the URL', async () => {
      const res = await post(validFields, 'form');
      expect(res.status).toBe(303);
      expect(res.headers.get('Location')).toBe('/contact/thanks/');
      expect(resendCalls()).toHaveLength(1);
    });

    it('never exposes the destination address in the response', async () => {
      for (const mode of ['json', 'form'] as const) {
        const res = await post(validFields, mode);
        expect(await res.text()).not.toContain('owner-secret');
        expect(res.headers.get('Location') ?? '').not.toContain('owner-secret');
      }
    });
  });

  describe('invalid field', () => {
    it('returns field errors as JSON and sends nothing', async () => {
      const res = await post({ ...validFields, email: 'not-an-email', message: '' }, 'json');
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.reason).toBe('validation');
      expect(Object.keys(data.errors).sort()).toEqual(['email', 'message']);
      expect(resendCalls()).toHaveLength(0);
    });

    it('returns an HTML page listing the fields without echoing values', async () => {
      const res = await post({ ...validFields, name: '<', email: 'evil<script>@x' }, 'form');
      expect(res.status).toBe(422);
      expect(res.headers.get('Content-Type')).toContain('text/html');
      expect(res.headers.get('Location')).toBeNull();
      const html = await res.text();
      expect(html).toContain('<strong>Name:</strong>');
      expect(html).toContain('<strong>Email:</strong>');
      expect(html).toContain('href="/contact/"');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('evil');
      expect(resendCalls()).toHaveLength(0);
    });
  });

  describe('honeypot', () => {
    it.each(['json', 'form'] as const)('pretends to succeed without sending (%s)', async (mode) => {
      const res = await post({ ...validFields, company_website: 'http://spam.example' }, mode);
      if (mode === 'json') {
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
      } else {
        expect(res.status).toBe(303);
        expect(res.headers.get('Location')).toBe('/contact/thanks/');
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('failed challenge', () => {
    it('rejects an invalid token as JSON', async () => {
      turnstileOk = false;
      const res = await post(validFields, 'json');
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toMatchObject({ ok: false, reason: 'challenge' });
      expect(data.message).toMatch(/check/i);
      expect(resendCalls()).toHaveLength(0);
    });

    it('rejects a missing token without calling siteverify', async () => {
      const { 'cf-turnstile-response': _omit, ...noToken } = validFields;
      const res = await post(noToken, 'form');
      expect(res.status).toBe(403);
      expect(await res.text()).toMatch(/complete the .*check/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects when the secret is not configured', async () => {
      const res = await onRequestPost({
        request: makeRequest(validFields, 'json'),
        env: { ...env, TURNSTILE_SECRET_KEY: undefined },
      });
      expect(res.status).toBe(403);
      expect(resendCalls()).toHaveLength(0);
    });
  });

  describe('provider failure', () => {
    it.each([
      ['a 5xx response', () => new Response('down', { status: 503 })],
      ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
    ])('returns a delivery error with phone and email on %s (JSON)', async (_label, response) => {
      resend = response;
      const res = await post(validFields, 'json');
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data).toMatchObject({ ok: false, reason: 'delivery' });
      expect(data.message).toContain(site.phone);
      expect(data.message).toContain(site.displayEmail);
    });

    it('returns an HTML delivery error page with phone and email (form)', async () => {
      resend = () => new Response('{"message":"bad key"}', { status: 401 });
      const res = await post(validFields, 'form');
      expect(res.status).toBe(502);
      const html = await res.text();
      expect(html).toContain(`tel:${site.phoneHref}`);
      expect(html).toContain(`mailto:${site.displayEmail}`);
      expect(html).not.toContain('owner-secret');
    });
  });

  it('rejects an unreadable body', async () => {
    const request = new Request('https://lumina.example/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    });
    const res = await onRequestPost({ request, env });
    expect(res.status).toBe(400);
  });
});
