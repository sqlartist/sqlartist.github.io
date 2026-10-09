// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE is the blog's public address. Change it here once a custom domain is set up.
const site = process.env.SITE_URL || 'https://sqlartist.github.io';

export default defineConfig({
  site,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed', wrap: false },
  },
});
