// Pulls new stories from Trevor's Medium RSS feed into src/content/posts and
// copies Medium-hosted images into public/images/medium so the blog does not
// depend on Medium's servers. Runs on a schedule from GitHub Actions.
//
//   node scripts/sync-medium-feed.mjs            # fetch feed + download images
//   node scripts/sync-medium-feed.mjs --feed f   # read a saved feed file instead
//   node scripts/sync-medium-feed.mjs --no-images
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { convertBody, frontmatter, slugify } from './medium-to-markdown.mjs';

const MEDIUM_USER = process.env.MEDIUM_USER || 'trevor.dwyer';
const FEED_URL = `https://medium.com/feed/@${MEDIUM_USER}`;
const POSTS_DIR = path.resolve('src/content/posts');
const IMAGES_DIR = path.resolve('public/images/medium');
const MIN_STORY_CHARS = 1200; // shorter items are comment replies, not stories

const args = process.argv.slice(2);
const feedFile = args.includes('--feed') ? args[args.indexOf('--feed') + 1] : null;
const withImages = !args.includes('--no-images');

const mediumId = (url = '') => (url.split('?')[0].match(/([0-9a-f]{10,12})\/?$/) || [])[1];

function existingIds() {
  const ids = new Set();
  for (const f of fs.readdirSync(POSTS_DIR)) {
    const m = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8').match(/^mediumUrl:\s*"?([^"\n]+)"?/m);
    const id = m && mediumId(m[1]);
    if (id) ids.add(id);
  }
  return ids;
}

async function importFeed() {
  const xml = feedFile
    ? fs.readFileSync(feedFile, 'utf8')
    : await fetch(FEED_URL, { headers: { 'user-agent': 'sqlartist-blog-sync' } }).then((r) => {
        if (!r.ok) throw new Error(`Feed request failed: ${r.status}`);
        return r.text();
      });
  const $ = cheerio.load(xml, { xml: true });
  const known = existingIds();
  let added = 0;

  $('item').each((_, item) => {
    const $item = $(item);
    const link = $item.find('link').text().split('?')[0].trim();
    const id = mediumId(link) || mediumId($item.find('guid').text());
    if (!id || known.has(id)) return;

    const html = $item.find('content\\:encoded').text() || $item.find('description').text();
    const plain = cheerio.load(html).text();
    const tags = $item.find('category').map((_, c) => $(c).text()).get();
    if (plain.length < MIN_STORY_CHARS && tags.length === 0) return;

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
    fs.writeFileSync(file, frontmatter({ title, subtitle, date, cover, mediumUrl: link, tags: prettyTags }) + '\n' + markdown);
    console.log(`+ new story: ${slug}`);
    added++;
  });
  console.log(`Feed: ${added} new ${added === 1 ? 'story' : 'stories'}.`);
}

async function localiseImages() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const pattern = /https:\/\/(?:cdn-images-\d|miro)\.medium\.com\/[^\s)"']+/g;
  let downloaded = 0;
  for (const f of fs.readdirSync(POSTS_DIR)) {
    const file = path.join(POSTS_DIR, f);
    let text = fs.readFileSync(file, 'utf8');
    const urls = [...new Set(text.match(pattern) || [])];
    for (const url of urls) {
      const name = url.split('/').pop().replace(/\*/g, '_').replace(/[^\w.-]/g, '');
      const fileName = /\.\w{3,4}$/.test(name) ? name : `${name}.jpg`;
      const target = path.join(IMAGES_DIR, fileName);
      if (!fs.existsSync(target)) {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`! could not download ${url} (${res.status})`);
          continue;
        }
        fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
        downloaded++;
      }
      text = text.split(url).join(`/images/medium/${fileName}`);
    }
    fs.writeFileSync(file, text);
  }
  console.log(`Images: ${downloaded} downloaded from Medium.`);
}

await importFeed();
if (withImages) await localiseImages();
