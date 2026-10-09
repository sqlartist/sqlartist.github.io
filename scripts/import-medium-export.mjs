// One-off import of a Medium export folder (the "posts" folder from Medium's
// "Download your information" zip). Only full stories are imported; short
// comment replies are skipped.
//
//   node scripts/import-medium-export.mjs path/to/posts
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { convertBody, frontmatter, slugify } from './medium-to-markdown.mjs';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/import-medium-export.mjs <posts folder>');
  process.exit(1);
}
const outDir = path.resolve('src/content/posts');
fs.mkdirSync(outDir, { recursive: true });

// https://medium.com/@user/my-story-title-f7e212603138 -> my-story-title
function mediumSlug(url) {
  const last = (url || '').split('/').pop() || '';
  return last.replace(/-[0-9a-f]{8,12}$/, '');
}

let imported = 0;
let skipped = 0;
for (const file of fs.readdirSync(dir).sort()) {
  if (!file.endsWith('.html') || file.startsWith('draft_')) continue;
  const $ = cheerio.load(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (!$('.graf--title').length) {
    skipped++;
    continue;
  }
  const title = $('h1.p-name').text().replace(/\s+/g, ' ').trim();
  const summary = $('section[data-field="subtitle"]').text().replace(/\s+/g, ' ').trim();
  const date = $('time.dt-published').attr('datetime');
  const mediumUrl = $('a.p-canonical').attr('href');
  const { markdown, subtitle, cover } = convertBody($('section[data-field="body"]').html(), { title, summary });
  const slug = mediumSlug(mediumUrl) || slugify(title);
  const fm = frontmatter({ title, subtitle: subtitle || summary, date, cover, mediumUrl });
  fs.writeFileSync(path.join(outDir, `${slug}.md`), fm + '\n' + markdown);
  imported++;
  console.log(`✓ ${slug}`);
}
console.log(`Imported ${imported} stories, skipped ${skipped} comment replies.`);
