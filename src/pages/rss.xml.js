import rss from '@astrojs/rss';
import profile from '../data/profile.json';
import { getPosts } from '../lib';

// Full-text feed: dev.to, Hashnode and others can import new posts from this.
export async function GET(context) {
  const posts = await getPosts();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const { render } = await import('astro:content');
  const { experimental_AstroContainer: AstroContainer } = await import('astro/container');
  const container = await AstroContainer.create();
  const items = [];
  for (const post of posts) {
    const { Content } = await render(post);
    const html = await container.renderToString(Content);
    items.push({
      title: post.data.title,
      description: post.data.subtitle,
      pubDate: post.data.date,
      link: `${base}/posts/${post.id}/`,
      categories: post.data.tags,
      content: html,
    });
  }
  return rss({
    title: `${profile.name} · ${profile.siteTitle}`,
    description: profile.tagline,
    site: context.site,
    items,
  });
}
