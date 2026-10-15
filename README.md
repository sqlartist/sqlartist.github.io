# sqlartist – Trevor Dwyer's blog

A fast, free blog with a Medium-style reading layout, a blue and gold theme, a
profile page, and every story imported from Medium. You never need to touch
code: you write in the browser and the site rebuilds itself.

## Writing and publishing (browser only)

1. Go to **https://app.pagescms.org** and sign in with GitHub.
2. Open this repository. You'll see **Stories** and **Profile**.
3. **Stories → Add an entry.** Fill in Title, Subtitle and Topics, add a cover
   image, then write the story in the editor (headings, bold, quotes, code
   blocks, images, links – the same things you use on Medium).
4. Untick **Draft** and press **Save**. The site updates about a minute later.

To change your bio, photo or links, open **Profile**.

## Cross-posting

- **Medium:** use Medium's *Import a story* (medium.com/p/import) with the link
  to your new post. Medium copies it and credits your blog as the original.
- **Substack:** in Substack go to **Settings → Import** and paste
  `https://sqlartist.github.io/rss.xml`. The feed carries every story in full,
  with pictures. Choose not to email subscribers if you only want the archive.
- **dev.to / Hashnode:** both can import automatically from the RSS feed at
  `/rss.xml` and mark your blog as the original.
- **Sharing:** every story has LinkedIn, X and Bluesky share links.

## Medium sync

Every morning a GitHub Action ("Sync from Medium") checks
`medium.com/feed/@trevor.dwyer`. Any new story you published on Medium is
copied here, and Medium-hosted images are saved into the site so nothing
breaks if Medium changes. Run it any time from the repository's **Actions**
tab → *Sync from Medium* → *Run workflow*. Comment replies are skipped.

Medium's feed only sends the opening of member-only stories. Those are never
published as a teaser: they wait as hidden drafts and GitHub opens an issue
called "Full text needed". To fill them in, download your Medium export
(Settings → Security and apps → Download your information) and upload the zip
into the `imports` folder on GitHub (Add file → Upload files). The rest is
automatic. Or paste the text into the story in Pages CMS and untick Draft.

Links in a story that point at your other stories on Medium are switched to
the blog copies, so readers stay on the blog.

## Hosting and domain

The site is hosted free on GitHub Pages (*Publish site* workflow). To use your
own domain, add it under **Settings → Pages → Custom domain**, point the
domain's DNS at GitHub as shown there, then set a repository variable
`SITE_URL` (Settings → Secrets and variables → Actions → Variables) to the
full address, for example `https://sqlartist.dev`.

## For developers

```sh
npm install
npm run dev            # local preview at http://localhost:4321
npm run build          # static site in dist/
npm run sync:medium    # pull new stories from the Medium feed
node scripts/import-medium-export.mjs <export>/posts --fill   # add missing / cut-off stories from a Medium export
```

Built with [Astro](https://astro.build). Stories are Markdown files in
`src/content/posts/`; profile details live in `src/data/profile.json`; the
look is in `src/styles/global.css`; the editor is configured in `.pages.yml`.
