// Imports stories from a Medium export (the "posts" folder from Medium's
// "Download your information" zip). Short comment replies are skipped.
//
//   node scripts/import-medium-export.mjs path/to/posts          # write every story
//   node scripts/import-medium-export.mjs path/to/posts --fill   # only add missing
//       stories, fill in ones the feed cut short and pick up renamed titles;
//       other edits on the blog are kept
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { convertBody, frontmatter, slugify } from './medium-to-markdown.mjs';
import { POSTS_DIR, isTeaser, mediumId, readPosts, updateTitle } from './post-tools.mjs';

const dir = process.argv[2];
const fill = process.argv.includes('--fill');
if (!dir) {
  console.error('Usage: node scripts/import-medium-export.mjs <posts folder> [--fill]');
  process.exit(1);
}
fs.mkdirSync(POSTS_DIR, { recursive: true });

// https://medium.com/@user/my-story-title-f7e212603138 -> my-story-title
function mediumSlug(url) {
  const last = (url || '').split('/').pop() || '';
  return last.replace(/-[0-9a-f]{8,12}$/, '');
}

const existing = new Map(readPosts().filter((p) => p.id).map((p) => [p.id, p]));
let imported = 0;
let filled = 0;
let retitled = 0;
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

  const known = existing.get(mediumId(mediumUrl));
  if (fill && known) {
    // Only replace stories that still hold Medium's cut-off opening; keep the
    // blog's own details (topics, era, run-it box) and publish them.
    if (!known.needsFullText || !isTeaser(known.body)) {
      if (updateTitle(known, title)) retitled++;
      continue;
    }
    let fm = known.fm.replace(/^title:.*$/m, `title: ${JSON.stringify(title)}`).replace(/^needsFullText:.*\n?/m, '').replace(/^draft:.*$/m, 'draft: false');
    if (!/^cover:/m.test(fm) && cover) fm = fm.replace(/^(date:.*)$/m, `$1\ncover: ${JSON.stringify(cover)}`);
    fs.writeFileSync(known.file, `---\n${fm.trim()}\n---\n\n${markdown}`);
    filled++;
    console.log(`✓ full text added: ${known.slug}`);
    continue;
  }

  const slug = mediumSlug(mediumUrl) || slugify(title);
  const target = path.join(POSTS_DIR, `${slug}.md`);
  if (fill && fs.existsSync(target)) continue;
  const fm = frontmatter({ title, subtitle: subtitle || summary, date, cover, mediumUrl });
  fs.writeFileSync(target, fm + '\n' + markdown);
  imported++;
  console.log(`✓ ${slug}`);
}
console.log(`Imported ${imported} new stories, filled in ${filled}, renamed ${retitled}, skipped ${skipped} comment replies.`);
