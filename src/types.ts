import {
    z
} from 'zod';

import {
    seedDataPrompt
} from './seed_types.js';

const CHANGE_ME_SENTINEL = 'CHANGE_ME';

const value = z.union([
    z.number(),
    z.string(),
    z.boolean()
])

export type Value = z.infer<typeof value>;

export const completionModelID = z.literal('openai.com:gpt-3.5-turbo');

export type CompletionModelID = z.infer<typeof completionModelID>;

export const knownEnvironmentData = z.object({
    openai_api_key: z.optional(z.string().refine((arg : string) => arg != CHANGE_ME_SENTINEL, {
        message: 'Required value was not changed from ' + CHANGE_ME_SENTINEL
    })),
    completion_model: z.optional(completionModelID)
});

export type KnownEnvironmentKey = keyof z.infer<typeof knownEnvironmentData>;

export const environmentData = knownEnvironmentData.catchall(value);

export type EnvironmentData = z.infer<typeof environmentData>;

const localSeedID = z.string().regex(/[a-zA-Z0-9-_]*/);

//A localSeedID is what a Seed is known as within the context of a specific seed packet:
export type LocalSeedID = z.infer<typeof localSeedID>;

//TODO: make sure it's a relative path or a URL
const seedPacketLocation = z.string();

export type SeedPacketLocation = z.infer<typeof seedPacketLocation>;

//TODO: make a regex test for valid shape: `url#localSeedID@int|latest`
const seedReference = z.string();

export type SeedReference = z.infer<typeof seedReference>;

export const seedData = z.discriminatedUnion("type", [
    seedDataPrompt
]);

export type SeedData = z.infer<typeof seedData>;

export type SeedDataType = SeedData["type"];

const seedPacket = z.object({
    version: z.number().int().finite().safe(),
    seeds: z.map(localSeedID, seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;