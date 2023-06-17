import {
    z
} from 'zod';

export const SeedDataPrompt = z.object({
    type: z.literal('prompt'),
    prompt: z.string()
});

export const SeedData = z.discriminatedUnion("type", [
    SeedDataPrompt
]);

export const SeedPacket = z.object({
    version: z.number().int().finite().safe(),
    seeds: z.map(z.string(), SeedData)
});

