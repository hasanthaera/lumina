// Enquiry validation and email composition. Pure functions shared by the
// Pages Function (authoritative) and the browser script (instant feedback).

import { enquiryServiceOptions, site } from '../config/site';

export const FIELDS = ['name', 'email', 'phone', 'service', 'message'] as const;
export type Field = (typeof FIELDS)[number];

export type EnquiryValues = Record<Field, string>;
export type EnquiryErrors = Partial<Record<Field, string>>;

export const FIELD_LABELS: Record<Field, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  service: 'Service of interest',
  message: 'Message',
};

export const LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  phoneMax: 30,
  messageMin: 10,
  messageMax: 2000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9 +()\-]*$/;

/** Length in characters (code points), so emoji etc. count once. */
const charLength = (s: string) => [...s].length;

const asString = (v: unknown) => (typeof v === 'string' ? v : '');

export type ValidationResult =
  | { ok: true; values: EnquiryValues; errors: Record<string, never> }
  | { ok: false; values: EnquiryValues; errors: EnquiryErrors };

export function validateEnquiry(input: Partial<Record<Field, unknown>>): ValidationResult {
  const values: EnquiryValues = {
    name: asString(input.name).trim(),
    email: asString(input.email).trim(),
    phone: asString(input.phone).trim(),
    service: asString(input.service).trim(),
    message: asString(input.message).replace(/\r\n?/g, '\n').trim(),
  };
  const errors: EnquiryErrors = {};

  const nameLen = charLength(values.name);
  if (nameLen === 0) errors.name = 'Enter your name.';
  else if (nameLen < LIMITS.nameMin) errors.name = `Name must be at least ${LIMITS.nameMin} characters.`;
  else if (nameLen > LIMITS.nameMax) errors.name = `Name must be ${LIMITS.nameMax} characters or fewer.`;

  if (values.email === '') errors.email = 'Enter your email address.';
  else if (charLength(values.email) > LIMITS.emailMax)
    errors.email = `Email must be ${LIMITS.emailMax} characters or fewer.`;
  else if (!EMAIL_RE.test(values.email))
    errors.email = 'Enter a valid email address, like name@example.com.';

  if (charLength(values.phone) > LIMITS.phoneMax)
    errors.phone = `Phone must be ${LIMITS.phoneMax} characters or fewer.`;
  else if (!PHONE_RE.test(values.phone))
    errors.phone = 'Phone can only contain digits, spaces and + ( ) -.';

  if (!enquiryServiceOptions.some((o) => o.value === values.service))
    errors.service = 'Choose a service.';

  const msgLen = charLength(values.message);
  if (msgLen === 0) errors.message = 'Enter a message.';
  else if (msgLen < LIMITS.messageMin)
    errors.message = `Message must be at least ${LIMITS.messageMin} characters.`;
  else if (msgLen > LIMITS.messageMax)
    errors.message = `Message must be ${LIMITS.messageMax} characters or fewer.`;

  return Object.keys(errors).length === 0
    ? { ok: true, values, errors: {} }
    : { ok: false, values, errors };
}

export function serviceLabel(value: string): string {
  return enquiryServiceOptions.find((o) => o.value === value)?.label ?? value;
}

export interface EnquiryEmail {
  subject: string;
  replyTo: string;
  text: string;
}

export interface EnquiryMeta {
  receivedAt: Date;
  /** Path of the page the form was sent from, e.g. `/contact/?service=handyman`. */
  sourcePage: string;
  timeZone?: string;
  locale?: string;
}

/** Collapse CR/LF (and other line breaks) so a value cannot inject email headers. */
export const stripLineBreaks = (s: string) => s.replace(/[\r\n\v\f\p{Zl}\p{Zp}]+/gu, ' ').trim();

export function formatReceivedAt(date: Date, timeZone: string = site.timeZone, locale: string = site.locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone,
  }).format(date);
}

/** Plain-text email for a validated enquiry. Customer input is never treated as HTML. */
export function buildEnquiryEmail(enquiry: EnquiryValues, meta: EnquiryMeta): EnquiryEmail {
  const service = serviceLabel(enquiry.service);
  const name = stripLineBreaks(enquiry.name);
  const text = [
    `New enquiry from the ${site.name} website.`,
    '',
    `Name: ${name}`,
    `Email: ${stripLineBreaks(enquiry.email)}`,
    `Phone: ${enquiry.phone ? stripLineBreaks(enquiry.phone) : '(not given)'}`,
    `Service of interest: ${service}`,
    '',
    'Message:',
    enquiry.message,
    '',
    '---',
    `Received: ${formatReceivedAt(meta.receivedAt, meta.timeZone, meta.locale)}`,
    `Sent from: ${stripLineBreaks(meta.sourcePage)}`,
    'Reply to this email to answer the customer directly.',
  ].join('\n');

  return {
    subject: stripLineBreaks(`New enquiry: ${service} – ${name}`),
    replyTo: stripLineBreaks(enquiry.email),
    text,
  };
}
