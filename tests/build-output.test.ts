// Checks the built site in dist/. Run `npm run build` first; skipped otherwise.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { site } from '../src/config/site';

const DIST = 'dist';
const built = existsSync(join(DIST, 'index.html'));

const read = (path: string) => readFileSync(join(DIST, path), 'utf8');
const pages = {
  home: 'index.html',
  services: 'services/index.html',
  landscaping: 'services/landscaping/index.html',
  handyman: 'services/handyman/index.html',
  paving: 'services/paving-decking/index.html',
  contact: 'contact/index.html',
  thanks: 'contact/thanks/index.html',
  notFound: '404.html',
};

const all = <T>(re: RegExp, html: string, pick: (m: RegExpMatchArray) => T) =>
  [...html.matchAll(re)].map(pick);
const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1];
const hrefs = (html: string) => all(/href="([^"]*)"/g, html, (m) => m[1]!.replace(/&amp;/g, '&'));
const mainOf = (html: string) => html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
const footerOf = (html: string) => html.match(/<footer[\s\S]*<\/footer>/)?.[0] ?? '';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return /\.(html|js|css|xml|txt)$/.test(name) ? [path] : [];
  });
}

describe.skipIf(!built)('built site', () => {
  it('gives every page a unique title, one h1, and no empty headings or lorem ipsum', () => {
    const titles = new Set<string>();
    for (const file of Object.values(pages)) {
      const html = read(file);
      const title = titleOf(html);
      expect(title, file).toBeTruthy();
      expect(titles.has(title!), `duplicate title ${title}`).toBe(false);
      titles.add(title!);
      expect(all(/<h1[\s>]/g, html, (m) => m[0]), file).toHaveLength(1);
      expect(html, file).not.toMatch(/<h([1-6])[^>]*>\s*<\/h\1>/);
      expect(html.toLowerCase(), file).not.toContain('lorem ipsum');
      expect(html, file).toMatch(/<meta name="description" content="[^"]+"/);
      expect(html, file).toMatch(/<meta property="og:title" content="[^"]+"/);
      expect(html, file).toMatch(/<meta property="og:description" content="[^"]+"/);
    }
  });

  it('gives public pages a canonical URL on the site origin', () => {
    for (const [key, file] of Object.entries(pages)) {
      if (key === 'thanks' || key === 'notFound') continue;
      expect(read(file), file).toMatch(new RegExp(`<link rel="canonical" href="${site.url}/`));
    }
  });

  it('shows tap-to-call and mailto links in every footer', () => {
    for (const file of Object.values(pages)) {
      const footer = footerOf(read(file));
      expect(footer, file).toContain(`href="tel:${site.phoneHref}"`);
      expect(footer, file).toContain(`href="mailto:${site.displayEmail}"`);
      expect(footer, file).toContain(site.serviceArea);
      expect(footer, file).toContain(String(new Date().getFullYear()));
    }
  });

  it('marks the current page in the navigation', () => {
    const current = (file: string) =>
      all(/<a href="([^"]+)" aria-current="page"/g, read(file), (m) => m[1]);
    expect(current(pages.home)).toEqual(['/']);
    expect(current(pages.services)).toEqual(['/services/']);
    expect(current(pages.handyman)).toEqual(['/services/handyman/']);
    expect(current(pages.contact)).toEqual(['/contact/']);
  });

  it('links Home to each service page and to Contact us', () => {
    const links = hrefs(mainOf(read(pages.home)));
    for (const s of site.services) expect(links).toContain(`/services/${s.slug}/`);
    expect(links).toContain('/contact/');
    expect(mainOf(read(pages.home))).toMatch(/<a class="button" href="\/contact\/"[^>]*>Get a quote<\/a>/);
  });

  it('lists every service on /services/', () => {
    const main = mainOf(read(pages.services));
    for (const s of site.services) {
      expect(main).toContain(`href="/services/${s.slug}/"`);
      expect(main).toContain(s.label);
    }
  });

  it('ends each service page with a CTA that pre-selects the service', () => {
    for (const s of site.services) {
      const html = read(`services/${s.slug}/index.html`);
      expect(hrefs(mainOf(html))).toContain(`/contact/?service=${s.slug}`);
      for (const job of s.typicalJobs) expect(html).toContain(job);
    }
  });

  it('adds valid LocalBusiness JSON-LD on Home', () => {
    const raw = read(pages.home).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw!);
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('LocalBusiness');
    expect(data.name).toBe(site.name);
    expect(data.telephone).toBe(site.phoneHref);
    expect(data.url).toBe(`${site.url}/`);
    expect(data.hasOfferCatalog.itemListElement).toHaveLength(site.services.length);
  });

  it('lists all public pages in the sitemap and nothing else', () => {
    const sitemap = read('sitemap-0.xml');
    const locs = all(/<loc>([^<]+)<\/loc>/g, sitemap, (m) => m[1]).sort();
    expect(locs).toEqual(
      ['/', '/contact/', '/services/', ...site.services.map((s) => `/services/${s.slug}/`)]
        .map((p) => `${site.url}${p}`)
        .sort(),
    );
    expect(read('robots.txt')).toContain(`Sitemap: ${site.url}/sitemap-index.xml`);
    expect(read('_redirects')).toMatch(/^\/sitemap\.xml \/sitemap-0\.xml 200$/m);
  });

  it('keeps the thank-you page out of search', () => {
    const html = read(pages.thanks);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('rel="canonical"');
  });

  it('links the 404 page to Home and Contact us', () => {
    const links = hrefs(mainOf(read(pages.notFound)));
    expect(links).toContain('/');
    expect(links).toContain('/contact/');
  });

  describe('contact page', () => {
    const html = built ? read(pages.contact) : '';
    const form = html.match(/<form[\s\S]*?<\/form>/)?.[0] ?? '';

    it('posts the form to /api/contact', () => {
      expect(form).toMatch(/<form[^>]*action="\/api\/contact"/);
      expect(form).toMatch(/<form[^>]*method="post"/);
    });

    it('labels every input', () => {
      const ids = all(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g, form, (m) => m[1]!);
      expect(ids.sort()).toEqual(['company_website', 'email', 'message', 'name', 'phone', 'service']);
      for (const id of ids) expect(form, id).toMatch(new RegExp(`<label for="${id}"`));
      expect(form).not.toMatch(/<input(?![^>]*\bid=)[^>]*>/);
    });

    it('includes a hidden honeypot and the Turnstile widget', () => {
      expect(form).toMatch(/<div class="hp" aria-hidden="true"[^>]*>/);
      expect(form).toMatch(/<input id="company_website" name="company_website"[^>]*tabindex="-1"[^>]*autocomplete="off"/);
      expect(form).toMatch(/id="turnstile"[^>]*data-sitekey="[^"]+"/);
      expect(html).toContain('https://challenges.cloudflare.com/turnstile/v0/api.js');
    });

    it('offers the four service options', () => {
      const options = all(/<option value="([^"]*)"/g, form, (m) => m[1]);
      expect(options).toEqual(['', 'landscaping', 'handyman', 'paving-decking', 'other']);
    });

    it('shows the business contact details', () => {
      const main = mainOf(html);
      expect(main).toContain(`tel:${site.phoneHref}`);
      expect(main).toContain(`mailto:${site.displayEmail}`);
      expect(main).toContain(site.serviceArea);
    });
  });

  it('never ships the destination email address', () => {
    const devVars = existsSync('.dev.vars') ? readFileSync('.dev.vars', 'utf8') : '';
    const to = devVars.match(/^CONTACT_TO_EMAIL=(.+)$/m)?.[1]?.trim();
    const secrets = [to, 'CONTACT_TO_EMAIL', 'RESEND_API_KEY', 'TURNSTILE_SECRET_KEY'].filter(Boolean) as string[];
    for (const file of htmlFiles(DIST)) {
      const text = readFileSync(file, 'utf8');
      for (const secret of secrets) expect(text, `${secret} in ${file}`).not.toContain(secret);
    }
  });
});
