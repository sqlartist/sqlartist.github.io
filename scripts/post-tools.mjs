// Shared helpers for the Medium sync and the Medium export import.
import fs from 'node:fs';
import path from 'node:path';

export const POSTS_DIR = path.resolve('src/content/posts');
export const IMAGES_DIR = path.resolve('public/images/medium');

// https://medium.com/@user/my-story-c5469bae2501?source=rss -> c5469bae2501
export const mediumId = (url = '') =>
  (url.split(/[?#]/)[0].match(/(?:^|[-/])([0-9a-f]{10,12})\/?$/) || [])[1];

// Medium's feed sends only the opening of member-only and publication stories.
export const isTeaser = (text = '') => /Continue reading on [^»]*»/i.test(text);

export function splitPost(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? { fm: m[1], body: text.slice(m[0].length) } : { fm: '', body: text };
}

const field = (fm, name) => {
  const m = fm.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : undefined;
};

export function readPosts() {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const file = path.join(POSTS_DIR, f);
      const text = fs.readFileSync(file, 'utf8');
      const { fm, body } = splitPost(text);
      const mediumUrl = field(fm, 'mediumUrl');
      return {
        file,
        slug: f.replace(/\.md$/, ''),
        text,
        fm,
        body,
        mediumUrl,
        id: mediumId(mediumUrl),
        draft: field(fm, 'draft') === 'true',
        needsFullText: field(fm, 'needsFullText') === 'true',
      };
    });
}

// Medium is where Trevor renames stories, so a newer title there replaces the blog's.
// The story keeps its blog address. Returns true when the title changed.
export function updateTitle(post, title) {
  const raw = (post.fm.match(/^title:\s*(.*)$/m) || [])[1];
  if (!title || raw === undefined) return false;
  let current = raw.trim();
  try {
    current = current.startsWith('"') ? JSON.parse(current) : current.replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
  } catch {}
  if (title === current) return false;
  const fm = post.fm.replace(/^title:.*$/m, `title: ${JSON.stringify(title)}`);
  fs.writeFileSync(post.file, post.text.replace(post.fm, fm));
  console.log(`✎ new title for ${post.slug}: ${current} → ${title}`);
  return true;
}

// Links in story text that point at Trevor's own stories on Medium go to the
// blog copy instead, so readers never get bounced to Medium's paywall.
export function relinkMedium() {
  const posts = readPosts();
  const live = new Map(posts.filter((p) => p.id && !p.draft).map((p) => [p.id, p.slug]));
  const pattern = /https?:\/\/(?:[\w-]+\.)?medium\.com\/[^\s)"'\]<>]+/g;
  let changed = 0;
  for (const post of posts) {
    const body = post.body.replace(pattern, (url) => {
      const slug = live.get(mediumId(url));
      return slug ? `/posts/${slug}/` : url;
    });
    if (body !== post.body) {
      fs.writeFileSync(post.file, post.text.slice(0, post.text.length - post.body.length) + body);
      changed++;
    }
  }
  console.log(`Links: ${changed} ${changed === 1 ? 'story' : 'stories'} now point at the blog instead of Medium.`);
}

// Copies Medium-hosted images into public/images/medium so the blog does not
// depend on Medium's servers.
export async function localiseImages() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const pattern = /https:\/\/(?:cdn-images-\d|miro)\.medium\.com\/[^\s)"']+/g;
  let downloaded = 0;
  for (const post of readPosts()) {
    let text = post.text;
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
    if (text !== post.text) fs.writeFileSync(post.file, text);
  }
  console.log(`Images: ${downloaded} downloaded from Medium.`);
}
