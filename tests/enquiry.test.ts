import { describe, expect, it } from 'vitest';
import { buildEnquiryEmail, validateEnquiry, type EnquiryValues } from '../src/lib/enquiry';

const valid: EnquiryValues = {
  name: 'Jane Citizen',
  email: 'jane@example.com',
  phone: '+61 (0)400 000-000',
  service: 'landscaping',
  message: 'Please quote for a new lawn.',
};

const errorsFor = (overrides: Partial<Record<keyof EnquiryValues, unknown>>) =>
  validateEnquiry({ ...valid, ...overrides }).errors;

describe('validateEnquiry', () => {
  it('accepts a valid enquiry and trims values', () => {
    const result = validateEnquiry({ ...valid, name: '  Jane Citizen  ', email: ' jane@example.com ' });
    expect(result.ok).toBe(true);
    expect(result.values.name).toBe('Jane Citizen');
    expect(result.values.email).toBe('jane@example.com');
  });

  it('treats missing and non-string inputs as empty', () => {
    const result = validateEnquiry({});
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['email', 'message', 'name', 'service']);
    expect(validateEnquiry({ ...valid, name: 42 }).errors.name).toBeDefined();
  });

  describe('name', () => {
    it('is required', () => expect(errorsFor({ name: '   ' }).name).toBeDefined());
    it('rejects 1 character', () => expect(errorsFor({ name: 'J' }).name).toBeDefined());
    it('accepts 2 characters', () => expect(errorsFor({ name: 'Jo' }).name).toBeUndefined());
    it('accepts 100 characters', () => expect(errorsFor({ name: 'a'.repeat(100) }).name).toBeUndefined());
    it('rejects 101 characters', () => expect(errorsFor({ name: 'a'.repeat(101) }).name).toBeDefined());
    it('counts characters, not UTF-16 units', () =>
      expect(errorsFor({ name: '😀'.repeat(100) }).name).toBeUndefined());
  });

  describe('email', () => {
    it('is required', () => expect(errorsFor({ email: '' }).email).toBeDefined());
    it('rejects not-an-email', () => expect(errorsFor({ email: 'not-an-email' }).email).toBeDefined());
    it('rejects a missing domain dot', () => expect(errorsFor({ email: 'a@b' }).email).toBeDefined());
    it('rejects embedded whitespace', () => expect(errorsFor({ email: 'a b@c.com' }).email).toBeDefined());
    it('rejects an embedded newline', () =>
      expect(errorsFor({ email: 'a@b.com\nBcc: x@y.com' }).email).toBeDefined());
    const local = 'a'.repeat(64);
    const at254 = `${local}@${'b'.repeat(254 - 64 - 1 - 4)}.com`;
    it('accepts 254 characters', () => {
      expect(at254).toHaveLength(254);
      expect(errorsFor({ email: at254 }).email).toBeUndefined();
    });
    it('rejects 255 characters', () => expect(errorsFor({ email: `a${at254}` }).email).toBeDefined());
  });

  describe('phone', () => {
    it('is optional', () => expect(errorsFor({ phone: '' }).phone).toBeUndefined());
    it('allows digits, spaces, + ( ) -', () =>
      expect(errorsFor({ phone: '+61 (2) 9999-0000' }).phone).toBeUndefined());
    it('rejects letters', () => expect(errorsFor({ phone: '0400 ABC' }).phone).toBeDefined());
    it('rejects other symbols', () => expect(errorsFor({ phone: '0400.000' }).phone).toBeDefined());
    it('accepts 30 characters', () => expect(errorsFor({ phone: '1'.repeat(30) }).phone).toBeUndefined());
    it('rejects 31 characters', () => expect(errorsFor({ phone: '1'.repeat(31) }).phone).toBeDefined());
  });

  describe('service', () => {
    it.each(['landscaping', 'handyman', 'paving-decking', 'other'])('accepts %s', (service) =>
      expect(errorsFor({ service }).service).toBeUndefined());
    it('is required', () => expect(errorsFor({ service: '' }).service).toBeDefined());
    it('rejects unknown services', () => expect(errorsFor({ service: 'plumbing' }).service).toBeDefined());
    it('rejects labels instead of values', () =>
      expect(errorsFor({ service: 'Landscaping' }).service).toBeDefined());
  });

  describe('message', () => {
    it('is required', () => expect(errorsFor({ message: '' }).message).toBeDefined());
    it('rejects 9 characters', () => expect(errorsFor({ message: 'a'.repeat(9) }).message).toBeDefined());
    it('accepts 10 characters', () => expect(errorsFor({ message: 'a'.repeat(10) }).message).toBeUndefined());
    it('accepts 2000 characters', () =>
      expect(errorsFor({ message: 'a'.repeat(2000) }).message).toBeUndefined());
    it('rejects 2001 characters', () =>
      expect(errorsFor({ message: 'a'.repeat(2001) }).message).toBeDefined());
    it('does not count surrounding whitespace', () =>
      expect(errorsFor({ message: `   ${'a'.repeat(9)}   ` }).message).toBeDefined());
    it('normalises CRLF line endings', () =>
      expect(validateEnquiry({ ...valid, message: 'line one\r\nline two' }).values.message).toBe(
        'line one\nline two',
      ));
  });
});

describe('buildEnquiryEmail', () => {
  const meta = {
    receivedAt: new Date('2026-03-02T01:30:00Z'),
    sourcePage: '/contact/?service=landscaping',
    timeZone: 'Australia/Sydney',
    locale: 'en-AU',
  };

  it('builds the subject, reply-to and plain-text body', () => {
    const email = buildEnquiryEmail(validateEnquiry(valid).values, meta);
    expect(email.subject).toBe('New enquiry: Landscaping – Jane Citizen');
    expect(email.replyTo).toBe('jane@example.com');
    expect(email.text).toContain('Name: Jane Citizen');
    expect(email.text).toContain('Email: jane@example.com');
    expect(email.text).toContain('Phone: +61 (0)400 000-000');
    expect(email.text).toContain('Service of interest: Landscaping');
    expect(email.text).toContain('Please quote for a new lawn.');
    expect(email.text).toContain('Sent from: /contact/?service=landscaping');
  });

  it('shows the received time in the business time zone', () => {
    const email = buildEnquiryEmail(valid, meta);
    // 01:30 UTC on 2 March is 12:30 pm AEDT the same day in Sydney.
    expect(email.text).toMatch(/Received: Monday,? 2 March 2026.*12:30:00\s?pm/i);
  });

  it('notes a missing phone number', () => {
    expect(buildEnquiryEmail({ ...valid, phone: '' }, meta).text).toContain('Phone: (not given)');
  });

  it('uses Other for the other option', () => {
    expect(buildEnquiryEmail({ ...valid, service: 'other' }, meta).subject).toBe(
      'New enquiry: Other – Jane Citizen',
    );
  });

  it('keeps HTML in the message as literal text', () => {
    const email = buildEnquiryEmail({ ...valid, message: '<script>alert(1)</script>' }, meta);
    expect(email.text).toContain('<script>alert(1)</script>');
    expect(email).not.toHaveProperty('html');
  });

  it('strips CR/LF from header values', () => {
    const email = buildEnquiryEmail(
      { ...valid, name: 'Jane\r\nBcc: attacker@example.com', email: 'jane@example.com\r\n' },
      meta,
    );
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject).toBe('New enquiry: Landscaping – Jane Bcc: attacker@example.com');
    expect(email.replyTo).toBe('jane@example.com');
    expect(email.text).toContain('Name: Jane Bcc: attacker@example.com\n');
  });

  it('keeps line breaks inside the message body', () => {
    expect(buildEnquiryEmail({ ...valid, message: 'one\ntwo' }, meta).text).toContain('Message:\none\ntwo\n');
  });
});
