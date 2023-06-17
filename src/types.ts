import {
    z
} from 'zod';

import {
    seedDataPrompt
} from './seed_types.js';

const value = z.union([
    z.number(),
    z.string(),
    z.boolean()
])

export type Value = z.infer<typeof value>;

export const environment = z.object({
    openai_api_key: z.optional(z.string())
}).catchall(z.string());

export type Environment = z.infer<typeof environment>;

const seedID = z.string();

export type SeedID = z.infer<typeof seedID>;

export const seedData = z.discriminatedUnion("type", [
    seedDataPrompt
]);

export type SeedData = z.infer<typeof seedData>;

const seedPacket = z.object({
    version: z.number().int().finite().safe(),
    seeds: z.map(z.string(), seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;