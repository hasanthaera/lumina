// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/config/site.ts';

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // The thank-you page is noindex and must not be listed.
      filter: (page) => !page.includes('/contact/thanks/'),
    }),
  ],
});
