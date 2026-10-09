// Converts one Medium story (export HTML or RSS content) into a Markdown post.
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const IMG_SIZE = 1400;

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

function biggerImage(src) {
  return src.replace(/\/max\/\d+\//, `/max/${IMG_SIZE}/`);
}

function yamlString(value) {
  return JSON.stringify(value ?? '');
}

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    hr: '---',
  });
  td.use(gfm);

  // Medium code blocks: <pre data-code-block-lang="sql"><span>..<br>..</span></pre>
  td.addRule('mediumPre', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (_content, node) => {
      const lang = node.getAttribute('data-code-block-lang') || '';
      let code = node.textContent.replace(/\u00a0/g, ' ');
      // Some blocks were pasted with their own ``` fences inside; drop them.
      code = code.replace(/^\s*```[a-z]*\s*\n/i, '').replace(/\n\s*```\s*$/, '');
      code = code.replace(/\s+$/, '');
      return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    },
  });

  // Figures: image with the caption in italics directly underneath.
  td.addRule('mediumFigure', {
    filter: 'figure',
    replacement: (_content, node) => {
      const img = node.querySelector('img');
      if (!img) return '';
      const src = biggerImage(img.getAttribute('src') || '');
      const capNode = node.querySelector('figcaption');
      const caption = capNode ? td.turndown(capNode.innerHTML).replace(/\n+/g, ' ').trim() : '';
      const alt = (capNode ? capNode.textContent : '').replace(/[[\]]/g, '').trim();
      return `\n\n![${alt}](${src})${caption ? `\n*${caption.replace(/^\*|\*$/g, '')}*` : ''}\n\n`;
    },
  });

  td.addRule('pullquote', {
    filter: (node) => node.nodeName === 'BLOCKQUOTE',
    replacement: (content) => '\n\n' + content.trim().split('\n').map((l) => `> ${l}`).join('\n') + '\n\n',
  });

  return td;
}

/**
 * @param {string} bodyHtml  HTML of the story body
 * @param {{title?: string, summary?: string}} opts
 * @returns {{ markdown: string, subtitle: string, cover: string }}
 */
export function convertBody(bodyHtml, { title = '', summary = '' } = {}) {
  const $ = cheerio.load(bodyHtml, null, false);
  let subtitle = '';

  // Title is shown by the page layout, so drop it from the body.
  const titleEl = $('.graf--title').first();
  if (titleEl.length) titleEl.remove();
  else {
    const first = $('h1, h3').first();
    if (first.length && first.text().trim() === title.trim()) first.remove();
  }
  const sub = $('.graf--subtitle').first();
  if (sub.length) {
    subtitle = sub.text().trim();
    sub.remove();
  } else {
    // Medium writers often open with a standfirst: a heading, an all-italic or
    // all-bold line, or the short line Medium used as the story's summary.
    const firstP = $('.graf').first();
    const text = firstP.text().replace(/\s+/g, ' ').trim();
    const only = firstP.children('em, strong, b, i');
    const styled = only.length === 1 && only.text().replace(/\s+/g, ' ').trim() === text;
    const lead = summary.replace(/…$/, '').trim();
    const matchesSummary = lead.length > 20 && text.startsWith(lead);
    if (
      text && text.length < 300 && !firstP.find('img').length &&
      (firstP.is('h3, h4') || styled || matchesSummary)
    ) {
      subtitle = text;
      firstP.remove();
    }
  }

  // Medium's large heading is h3 and small heading h4; on the blog those are
  // h2 and h3. Bold inside headings is redundant.
  $('h3').each((_, el) => { el.tagName = 'h2'; });
  $('h4').each((_, el) => { el.tagName = 'h3'; });
  $('h2 strong, h3 strong, h2 b, h3 b').each((_, el) => { $(el).replaceWith($(el).html()); });

  // Section dividers: drop the first, turn the rest into horizontal rules.
  $('hr.section-divider').each((i, el) => {
    if (i === 0) $(el).remove();
    else $(el).replaceWith('<hr>');
  });
  $('.section-divider').each((_, el) => {
    if (!$(el).children().length) $(el).remove();
  });

  // Line breaks inside code blocks become real newlines.
  // Line breaks inside code blocks become real newlines.
  $('pre br').replaceWith('\n');

  const cover = biggerImage($('img').first().attr('src') || '');

  const td = makeTurndown();
  let markdown = td.turndown($.html());
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { markdown, subtitle, cover };
}

export function frontmatter({ title, subtitle, date, cover, mediumUrl, tags = [] }) {
  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `subtitle: ${yamlString(subtitle)}`,
    `date: ${date}`,
  ];
  if (cover) lines.push(`cover: ${yamlString(cover)}`);
  lines.push(`tags: [${tags.map(yamlString).join(', ')}]`);
  if (mediumUrl) lines.push(`mediumUrl: ${yamlString(mediumUrl)}`);
  lines.push('draft: false', '---', '');
  return lines.join('\n');
}
