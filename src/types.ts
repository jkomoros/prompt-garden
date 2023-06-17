import {
    z
} from 'zod';

export const environment = z.object({
    openai_api_key: z.optional(z.string())
}).catchall(z.string());

export type Environment = z.infer<typeof environment>;

const seedDataPrompt = z.object({
    type: z.literal('prompt'),
    prompt: z.string()
});

type SeedDataPrompt = z.infer<typeof seedDataPrompt>;

const seedData = z.discriminatedUnion("type", [
    seedDataPrompt
]);

export type SeedData = z.infer<typeof seedData>;

const seedPacket = z.object({
    version: z.number().int().finite().safe(),
    seeds: z.map(z.string(), seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;

const seedID = z.string();

export type SeedID = z.infer<typeof seedID>;

