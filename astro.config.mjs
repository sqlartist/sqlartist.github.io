// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';

// SITE is the blog's public address. Change it here once a custom domain is set up.
const site = process.env.SITE_URL || 'https://sqlartist.github.io';

// A video in a story is written like a picture, ![What it shows](/images/uploads/clip.mp4), so the
// Pages CMS editor keeps it when the story is edited; here it becomes a video player, with sound.
const videosFromPictures = {
  name: 'videos-from-pictures',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      const src = String(node.properties?.src ?? '');
      if (!/\.(mp4|webm)$/i.test(src)) return;
      ctx.replaceNode(node, {
        type: 'element',
        tagName: 'video',
        properties: {
          src,
          controls: true,
          preload: 'metadata',
          playsInline: true,
          title: String(node.properties?.alt ?? ''),
          style: 'width:100%;height:auto;display:block',
        },
        children: [],
      });
    },
  },
};

export default defineConfig({
  site,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    processor: satteri({ hastPlugins: [videosFromPictures] }),
    shikiConfig: { theme: 'github-dark-dimmed', wrap: false },
  },
});
