// Email delivery via the Resend HTTP API. Pages Functions cannot use SMTP.
// Swap providers by replacing this file; callers only see SendResult.

import type { EnquiryEmail } from './enquiry';

export interface EmailEnv {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendEnquiryEmail(env: EmailEnv, email: EnquiryEmail): Promise<SendResult> {
  const { RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL } = env;
  if (!RESEND_API_KEY || !CONTACT_FROM_EMAIL || !CONTACT_TO_EMAIL) {
    return { ok: false, error: 'Email is not configured (missing RESEND_API_KEY, CONTACT_FROM_EMAIL or CONTACT_TO_EMAIL).' };
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { ok: false, error: `Resend responded ${response.status}: ${detail.slice(0, 500)}` };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: `Resend request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
