// Pulls new stories from Trevor's Medium RSS feed into src/content/posts and
// copies Medium-hosted images into public/images/medium so the blog does not
// depend on Medium's servers. Runs on a schedule from GitHub Actions.
//
// Medium's feed only carries the opening of member-only and publication
// stories. Those are saved as hidden drafts marked needsFullText, never
// published as a teaser; the "Import Medium export" workflow fills them in.
//
//   node scripts/sync-medium-feed.mjs            # fetch feed + download images
//   node scripts/sync-medium-feed.mjs --feed f   # read a saved feed file instead
//   node scripts/sync-medium-feed.mjs --no-images
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { convertBody, frontmatter, slugify } from './medium-to-markdown.mjs';
import { POSTS_DIR, isTeaser, localiseImages, mediumId, readPosts, relinkMedium } from './post-tools.mjs';

const MEDIUM_USER = process.env.MEDIUM_USER || 'trevor.dwyer';
const FEED_URL = `https://medium.com/feed/@${MEDIUM_USER}`;
const MIN_STORY_CHARS = 1200; // shorter items are comment replies, not stories

const args = process.argv.slice(2);
const feedFile = args.includes('--feed') ? args[args.indexOf('--feed') + 1] : null;
const withImages = !args.includes('--no-images');

async function importFeed() {
  const xml = feedFile
    ? fs.readFileSync(feedFile, 'utf8')
    : await fetch(FEED_URL, { headers: { 'user-agent': 'sqlartist-blog-sync' } }).then((r) => {
        if (!r.ok) throw new Error(`Feed request failed: ${r.status}`);
        return r.text();
      });
  const $ = cheerio.load(xml, { xml: true });
  const known = new Set(readPosts().map((p) => p.id).filter(Boolean));
  const teasers = [];
  let added = 0;

  $('item').each((_, item) => {
    const $item = $(item);
    const link = $item.find('link').text().split('?')[0].trim();
    const id = mediumId(link) || mediumId($item.find('guid').text());
    // Shown on the Actions run page, so it's easy to see what Medium sent.
    if (process.env.GITHUB_ACTIONS) {
      const state = !id ? 'not a story' : known.has(id) ? 'already on the blog' : 'new';
      console.log(`::notice title=In the Medium feed::${$item.find('title').text().trim()} (${state})`);
    }
    if (!id || known.has(id)) return;

    const html = $item.find('content\\:encoded').text() || $item.find('description').text();
    const plain = cheerio.load(html).text();
    const tags = $item.find('category').map((_, c) => $(c).text()).get();
    const teaser = isTeaser(plain);
    if (!teaser && plain.length < MIN_STORY_CHARS && tags.length === 0) return;

    const title = $item.find('title').text().replace(/\s+/g, ' ').trim();
    const date = new Date($item.find('pubDate').text()).toISOString();
    const { markdown, subtitle, cover } = convertBody(html, { title });
    const prettyTags = tags.map((t) =>
      t
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\b(Sql|Ai|Tsql|Llm|Gpu)\b/g, (w) => w.toUpperCase()),
    );
    const slug = link.split('/').pop().replace(/-[0-9a-f]{10,12}$/, '') || slugify(title);
    const file = path.join(POSTS_DIR, `${slug}.md`);
    if (fs.existsSync(file)) return;
    const fm = frontmatter({
      title,
      subtitle,
      date,
      cover,
      mediumUrl: link,
      tags: prettyTags,
      draft: teaser,
      needsFullText: teaser,
    });
    fs.writeFileSync(file, fm + '\n' + markdown);
    if (teaser) {
      teasers.push({ slug, title, link });
      console.log(`~ only the opening was in the feed, saved as a hidden draft: ${slug}`);
    } else {
      console.log(`+ new story: ${slug}`);
      added++;
    }
  });
  console.log(`Feed: ${added} new ${added === 1 ? 'story' : 'stories'}, ${teasers.length} waiting for full text.`);

  // Tell the workflow which stories need their full text, so it can open an issue.
  if (process.env.GITHUB_OUTPUT && teasers.length) {
    const list = teasers.map((t) => `- **${t.title}** (${t.link})`).join('\n');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `teasers<<EOF\n${list}\nEOF\n`);
  }
}

await importFeed();
if (withImages) await localiseImages();
relinkMedium();
