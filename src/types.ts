import {
    z
} from 'zod';

export const environment = z.map(z.string(), z.string());

export type Environment = z.infer<typeof environment>;

export const seedDataPrompt = z.object({
    type: z.literal('prompt'),
    prompt: z.string()
});

export type SeedDataPrompt = z.infer<typeof seedDataPrompt>;

export const seedData = z.discriminatedUnion("type", [
    seedDataPrompt
]);

export type SeedData = z.infer<typeof seedData>;

export const seedPacket = z.object({
    version: z.number().int().finite().safe(),
    seeds: z.map(z.string(), seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;

