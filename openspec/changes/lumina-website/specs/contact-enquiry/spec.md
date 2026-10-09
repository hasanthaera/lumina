# Spec Delta

## Purpose

Lets prospective customers send Lumina an enquiry from the Contact us page and delivers each
valid enquiry to the business owner's email address.

## ADDED Requirements

### Requirement: Contact us page
The site SHALL have a Contact us page (`/contact/`) showing the business phone number, display
email and service area, and an enquiry form with these fields:

| Field | Required | Rules |
|---|---|---|
| Name | Yes | 2–100 characters |
| Email | Yes | Valid email address, max 254 characters |
| Phone | No | Max 30 characters; digits, spaces, `+`, `(`, `)`, `-` only |
| Service of interest | Yes | One of: Landscaping, Handyman, Paving / Decking, Other |
| Message | Yes | 10–2000 characters |

Every field SHALL have a visible label. When the page is opened with a `service` query
parameter matching a service (`landscaping`, `handyman`, `paving-decking`), that service SHALL
be pre-selected.

#### Scenario: Pre-selected service
- **WHEN** a visitor opens `/contact/?service=handyman`
- **THEN** "Handyman" is selected in the Service of interest field

#### Scenario: Unknown service parameter
- **WHEN** a visitor opens `/contact/?service=plumbing`
- **THEN** no service is pre-selected and the page loads normally

### Requirement: Enquiry validation
The system SHALL validate every submission on the server against the field rules, regardless
of any validation done in the browser. An invalid submission SHALL NOT be emailed; the visitor
SHALL be shown which fields need fixing, and the values they entered SHALL be kept in the form
(see the no-script fallback below for the one exception).

#### Scenario: Missing required field
- **WHEN** a visitor submits the form without a message
- **THEN** no email is sent and the form shows an error on the Message field with the other entered values retained

#### Scenario: Invalid email address
- **WHEN** a visitor submits `not-an-email` as their email
- **THEN** no email is sent and the Email field shows an error

### Requirement: Spam protection
The form SHALL include a bot challenge and a hidden honeypot field. A submission that fails or
omits the bot challenge SHALL be rejected without sending an email. A submission with the
honeypot field filled in SHALL NOT be emailed but SHALL show the normal success message, so
bots get no signal.

#### Scenario: Failed bot challenge
- **WHEN** a submission arrives with a missing or invalid bot-challenge token
- **THEN** no email is sent and the visitor is asked to complete the check and try again

#### Scenario: Honeypot filled
- **WHEN** a submission arrives with the hidden honeypot field filled in
- **THEN** no email is sent and the success message is shown

### Requirement: Enquiry delivered to the owner's email
Each valid submission SHALL be sent as one email to the business owner's destination address,
which is held in server-side configuration and never exposed to the browser. The email SHALL:
- have the subject `New enquiry: {service} – {name}`;
- set **Reply-To** to the customer's email address;
- contain every submitted field, plus the date/time received (in the business's time zone) and
  the page it was sent from;
- render customer input as plain text (no HTML or script from the customer is interpreted).

#### Scenario: Successful enquiry
- **WHEN** a visitor submits a valid enquiry for Landscaping from Jane Citizen
- **THEN** the owner receives one email with subject `New enquiry: Landscaping – Jane Citizen`, Reply-To set to Jane's email, and all submitted details

#### Scenario: Owner replies
- **WHEN** the owner selects "Reply" on the enquiry email
- **THEN** the reply is addressed to the customer's email address

#### Scenario: HTML in message
- **WHEN** a customer's message contains `<script>alert(1)</script>`
- **THEN** the email shows that text literally and no script or markup is interpreted

#### Scenario: Destination email not exposed
- **WHEN** the Contact us page source and its network traffic are inspected
- **THEN** the owner's destination email address does not appear (only the separately configured display email does)

### Requirement: Submission feedback
After a valid submission is accepted for delivery, the visitor SHALL see a confirmation message
thanking them and saying the business will be in touch. If the email cannot be sent, the
visitor SHALL see an error message that includes the business phone number and display email
as an alternative, and their entered values SHALL be kept so they can retry.

#### Scenario: Confirmation
- **WHEN** a valid enquiry is sent successfully
- **THEN** the visitor sees a thank-you confirmation

#### Scenario: Email delivery fails
- **WHEN** the email provider is unavailable or rejects the message
- **THEN** the visitor sees an error message with the phone number and display email, and the form keeps their entered values

### Requirement: Form works without client-side scripting for submission
The form SHALL submit as a standard HTML form post so that submission and server-side
validation work even if the page's enhancement script fails to load; the bot challenge is the
only part that requires JavaScript. In this fallback, validation errors SHALL be shown on an
error page listing the fields to fix with a link back to the form. Submitted values SHALL NOT
be placed in URLs in either mode.

#### Scenario: Enhancement script blocked
- **WHEN** the site's own form-enhancement script fails to load but the bot challenge completes
- **THEN** submitting the form still delivers the enquiry and shows the confirmation page

#### Scenario: Fallback validation error
- **WHEN** the enhancement script is not running and a submission fails validation
- **THEN** an error page lists the fields to fix and links back to the Contact us form, and no submitted values appear in the URL
