import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const lore = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/lore" }),
  schema: z.object({
    title: z.string(),
    region: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    mapX: z.number().min(0).max(100).optional(),
    mapY: z.number().min(0).max(100).optional(),
  }),
});

const npcs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/npcs" }),
  schema: z.object({
    name: z.string(),
    race: z.string(),
    role: z.string(),
    locationSlug: z.string(),
    summary: z.string(),
  }),
});

export const collections = {
  lore,
  npcs,
};