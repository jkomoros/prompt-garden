import {
	z
} from 'zod';

const CHANGE_ME_SENTINEL = 'CHANGE_ME';

const value = z.union([
	z.number(),
	z.string(),
	z.boolean()
]);

export type Value = z.infer<typeof value>;

export const completionModelID = z.literal('openai.com:gpt-3.5-turbo');

export type CompletionModelID = z.infer<typeof completionModelID>;

export const knownEnvironmentData = z.object({
	openai_api_key: z.optional(z.string().refine((arg : string) => arg != CHANGE_ME_SENTINEL, {
		message: 'Required value was not changed from ' + CHANGE_ME_SENTINEL
	})),
	completion_model: z.optional(completionModelID),
	mock: z.optional(z.boolean()),
	verbose: z.optional(z.boolean())
});

type KnownEnvironmentData = z.infer<typeof knownEnvironmentData>;

type KnownEnvironmentDataOfType<T, V> = {
    [K in keyof T as T[K] extends V ? K : never]: T[K]
};

export type KnownEnvironmentStringKey = keyof KnownEnvironmentDataOfType<Required<KnownEnvironmentData>, string>;

export type KnownEnvironmentBooleanKey = keyof KnownEnvironmentDataOfType<Required<KnownEnvironmentData>, boolean>;

export type KnownEnvironmentKey = keyof z.infer<typeof knownEnvironmentData>;

export const environmentData = knownEnvironmentData.catchall(value);

export type EnvironmentData = z.infer<typeof environmentData>;

export const localSeedID = z.string().regex(/[a-zA-Z0-9-_]*/);

//A localSeedID is what a Seed is known as within the context of a specific seed packet:
export type LocalSeedID = z.infer<typeof localSeedID>;

//TODO: make sure it's a relative path or a URL
const seedPacketLocation = z.string();

export type SeedPacketLocation = z.infer<typeof seedPacketLocation>;

//TODO: make a regex test for valid shape: `url#localSeedID@int|latest`
const seedReferenceID = z.string();

export type SeedReferenceID = z.infer<typeof seedReferenceID>;

const seedReference = z.object({
	ref: seedReferenceID
});

export type SeedReference = z.infer<typeof seedReference>;

const seedDataBase = z.object({
	description: z.optional(z.string().describe('An optional description for what a seed does'))
});

/*
 *
 * Begin Seed Types
 * 
 */

export const seedDataPrompt = seedDataBase.extend({
	type: z.literal('prompt'),
	prompt: z.union([
		seedReference,
		z.string().describe('The full prompt to be passed to the configured commpletion_model')
	])
});

export type SeedDataPrompt = z.infer<typeof seedDataPrompt>;

export const seedDataLog = seedDataBase.extend({
	type: z.literal('log'),
	value: z.union([
		seedReference,
		value.describe('The message to echo back')
	])
});

export type SeedDataLog = z.infer<typeof seedDataLog>;

export const seedDataIf = seedDataBase.extend({
	type: z.literal('if'),
	test: z.union([
		seedReference,
		value.describe('The value to examine')
	]),
	then: z.union([
		seedReference,
		value.describe('The value to return if the value of test is truthy')
	]),
	else: z.union([
		seedReference,
		value.describe('The value to return if the value of test is falsy')
	])
});

export type SeedDataIf = z.infer<typeof seedDataIf>;

/*
 *
 * End Seed Types
 * 
 */

export const seedData = z.discriminatedUnion('type', [
	seedDataPrompt,
	seedDataLog,
	seedDataIf
]);

export type SeedData = z.infer<typeof seedData>;

export type SeedDataType = SeedData['type'];

export const seedPacket = z.object({
	version: z.literal(0),
	seeds: z.record(localSeedID, seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;