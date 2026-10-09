import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional().default(''),
    date: z.coerce.date(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // Where the story also lives on Medium (shown as "Also on Medium").
    mediumUrl: z.string().optional(),
    // Set when this post first appeared elsewhere and search engines should credit that copy.
    canonicalUrl: z.string().optional(),
    // "Run it in SQL" box for project stories.
    repo: z.string().optional(),
    runSteps: z.string().optional(),
    runSql: z.string().optional(),
    // The decade the story looks back to; one of the hypercube's dimensions.
    era: z.enum(['1980s', '1990s', '2000s', 'Today']).default('Today'),
    draft: z.boolean().default(false),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/glossary' }),
  schema: z.object({
    term: z.string(),
    year: z.string().optional().default(''),
    category: z.string().default('Other'),
    // What the thing is, in a sentence or two. The entry's body says why it mattered.
    what: z.string(),
    posts: z.array(z.string()).default([]),
  }),
});

export const collections = { posts, glossary };
