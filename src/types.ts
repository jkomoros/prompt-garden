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

const completionModel = z.literal('openai.com:gpt-3.5-turbo');

export type CompletionModel = z.infer<typeof completionModel>;

export const knownEnvironmentData = z.object({
    openai_api_key: z.optional(z.string()),
    completion_model: z.optional(completionModel)
});

export type KnownEnvironmentKey = keyof z.infer<typeof knownEnvironmentData>;

export const environmentData = knownEnvironmentData.catchall(z.string());

export type EnvironmentData = z.infer<typeof environmentData>;

const seedID = z.string();

export type SeedID = z.infer<typeof seedID>;

export const seedData = z.discriminatedUnion("type", [
    seedDataPrompt
]);

export type SeedData = z.infer<typeof seedData>;

export type SeedDataType = SeedData["type"];

const seedPacket = z.object({
    version: z.number().int().finite().safe(),
    seeds: z.map(z.string(), seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;