import { describe, expect, it } from 'vitest';
import { enquiryServiceOptions, findService, site } from '../src/config/site';

describe('site config', () => {
  it('defines the three services by slug', () => {
    expect(site.services.map((s) => s.slug)).toEqual([
      'landscaping',
      'handyman',
      'paving-decking',
    ]);
  });

  it('offers the services plus Other on the enquiry form', () => {
    expect(enquiryServiceOptions.map((o) => o.label)).toEqual([
      'Landscaping',
      'Handyman',
      'Paving / Decking',
      'Other',
    ]);
  });

  it('finds services by slug only', () => {
    expect(findService('handyman')?.label).toBe('Handyman');
    expect(findService('plumbing')).toBeUndefined();
    expect(findService(null)).toBeUndefined();
  });

  it('has a canonical URL without a trailing slash', () => {
    expect(site.url).not.toMatch(/\/$/);
  });
});
