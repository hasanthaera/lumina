import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEnquiryEmail } from '../src/lib/send-email';

const env = {
  RESEND_API_KEY: 're_test',
  CONTACT_FROM_EMAIL: 'Lumina Website <enquiries@lumina.example>',
  CONTACT_TO_EMAIL: 'owner@lumina.example',
};
const email = { subject: 'New enquiry: Handyman – Sam', replyTo: 'sam@example.com', text: 'Hello' };

afterEach(() => vi.unstubAllGlobals());

describe('sendEnquiryEmail', () => {
  it('posts a plain-text email to Resend and reports success', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'email_123' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendEnquiryEmail(env, email)).resolves.toEqual({ ok: true, id: 'email_123' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body as string)).toEqual({
      from: env.CONTACT_FROM_EMAIL,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: 'sam@example.com',
      subject: email.subject,
      text: 'Hello',
    });
  });

  it('reports a 4xx response as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"invalid from"}', { status: 422 })));
    const result = await sendEnquiryEmail(env, email);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('422');
  });

  it('reports a network error as a failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const result = await sendEnquiryEmail(env, email);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('fetch failed');
  });

  it('fails without calling the API when not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendEnquiryEmail({ ...env, RESEND_API_KEY: '' }, email);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
