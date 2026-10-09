// Public business details for the whole site. Change a value here and rebuild
// to update every page. Values marked PLACEHOLDER must be replaced before go-live.
//
// The owner's destination inbox is NOT here: it is the server-side secret
// CONTACT_TO_EMAIL, so it never reaches the browser.

export interface Service {
  /** URL segment: /services/<slug>/ and the contact form `service` value. */
  slug: string;
  label: string;
  /** One or two sentences, used on cards and in meta descriptions. */
  summary: string;
  /** Longer intro paragraph(s) on the service page. */
  description: string[];
  typicalJobs: string[];
}

export const site = {
  /** Short name, used in page titles. */
  name: 'Lumina',
  /** Full trading name, as on the logo. */
  fullName: 'Lumina Property Services',
  tagline: 'Landscaping, handyman and paving work, done properly.',
  /** Canonical origin, no trailing slash. PLACEHOLDER until the domain is known. */
  url: 'https://lumina.example',
  locale: 'en-AU',
  /** IANA time zone used for "received at" times in enquiry emails. PLACEHOLDER. */
  timeZone: 'Australia/Sydney',
  /** Shown as written; `phoneHref` is the tel: target. PLACEHOLDER. */
  phone: '0400 000 000',
  phoneHref: '+61400000000',
  /** Public display address, shown on the site. PLACEHOLDER. */
  displayEmail: 'hello@lumina.example',
  /** PLACEHOLDER. */
  serviceArea: 'Your local area and surrounding suburbs',
  services: [
    {
      slug: 'landscaping',
      label: 'Landscaping',
      summary:
        'Garden makeovers, planting, turf and retaining walls that make your outdoor space easy to enjoy.',
      description: [
        'Whether you want a low-maintenance garden, a fresh lawn or a complete backyard makeover, we plan the work with you and keep the site tidy while we do it.',
        'We can work from your ideas or help you put a simple plan together first.',
      ],
      typicalJobs: [
        'Garden design and planting',
        'Turf laying and lawn repair',
        'Garden beds, edging and mulching',
        'Small retaining walls',
        'Green waste removal and tidy-ups',
      ],
    },
    {
      slug: 'handyman',
      label: 'Handyman',
      summary:
        'Repairs, installations and odd jobs around the home, with no job too small.',
      description: [
        'From a sticking door to a list of small jobs that have been waiting for a free weekend, we turn up on time, do the work properly and clean up afterwards.',
        'Licensed trades work such as electrical and plumbing is referred to qualified specialists.',
      ],
      typicalJobs: [
        'Door, window and lock repairs',
        'Flat-pack assembly and shelving',
        'Hanging pictures, mirrors and TVs',
        'Minor carpentry and patching',
        'Fence and gate repairs',
      ],
    },
    {
      slug: 'paving-decking',
      label: 'Paving / Decking',
      summary:
        'New paths, patios and timber or composite decks, plus repairs and restoration of existing ones.',
      description: [
        'A good patio or deck adds usable living space. We prepare the base properly so paving stays level and decks stay solid for years.',
        'We also restore tired decks and re-lay uneven or sunken pavers.',
      ],
      typicalJobs: [
        'Paved paths, patios and driveways',
        'Timber and composite decks',
        'Deck sanding, oiling and board replacement',
        'Re-laying uneven or sunken pavers',
        'Steps and edging',
      ],
    },
  ] satisfies Service[],
} as const;

export type ServiceSlug = (typeof site.services)[number]['slug'];

/** Options for the contact form, in display order. `other` is form-only. */
export const enquiryServiceOptions: { value: string; label: string }[] = [
  ...site.services.map((s) => ({ value: s.slug, label: s.label })),
  { value: 'other', label: 'Other' },
];

export function findService(slug: string | null | undefined) {
  return site.services.find((s) => s.slug === slug);
}
