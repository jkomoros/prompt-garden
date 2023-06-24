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

export type LocalJSONFetcher = (location : string) => Promise<unknown>;

const absoluteRegExp = (r : RegExp) : RegExp => {
	return new RegExp('^' + r.source + '$');
};

const seedIDRegExp = new RegExp('[a-zA-Z0-9-_]*');

export const seedID = z
	.string()
	.regex(absoluteRegExp(seedIDRegExp))
	.describe('A local seed ID must just be letters, numbers, dashes, and underscores');

//A seedID is what a Seed is known as within the context of a specific seed packet:
export type SeedID = z.infer<typeof seedID>;

//We want to get schema type checking for valid shapes, which mean we have to rely entirely on finicky regexps :grimace:
//TODO: remove this eslint disable
//eslint-disable-next-line no-useless-escape
const relativeLocationRegExp = new RegExp('[.]{1,2}\/[\\w./-]+');

export const seedPacketRelativeLocation = z
	.string()
	.regex(absoluteRegExp(relativeLocationRegExp))
	.describe('A seed packet location must be a relative path, starting with . or ..');

export type SeedPacketRelativeLocation = z.infer<typeof seedPacketRelativeLocation>;

//TODO: should these all be file:// URLs?
const absoluteLocalLocationRegExp = new RegExp('[\\w./-]+');

export const seedPacketAbsoluteLocalLocation = z
	.string()
	.regex(absoluteRegExp(absoluteLocalLocationRegExp))
	.describe('A seed packet absolute location is a local path');

export type SeedPacketAbsoluteLocalLocation = z.infer<typeof seedPacketAbsoluteLocalLocation>;

export const seedPacketAbsoluteRemoteLocation = z
	.string()
	.url()
	.describe('A https:// or http:// absolute location');

export type SeedPacketAbsoluteRemoteLocation = z.infer<typeof seedPacketAbsoluteRemoteLocation>;

export const seedPacketAbsoluteLocation = z.union([
	seedPacketAbsoluteLocalLocation,
	seedPacketAbsoluteRemoteLocation
]);

export type SeedPacketAbsoluteLocation = z.infer<typeof seedPacketAbsoluteLocation>;

export const seedPacketLocation = z.union([
	seedPacketAbsoluteLocation,
	seedPacketRelativeLocation
]);

export type SeedPacketLocation = z.infer<typeof seedPacketLocation>;

export const seedReference = z.object({
	packet: z.optional(seedPacketLocation),
	id: seedID
});

export type SeedReference = z.infer<typeof seedReference>;

export const requiredSeedReference = z.object({
	packet: seedPacketAbsoluteLocation,
	id: seedID
});

export type AbsoluteSeedReference = z.infer<typeof requiredSeedReference>;

const seedDataBase = z.object({
	id: z.optional(seedID),
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

export const expandedSeedData = z.discriminatedUnion('type', [
	seedDataPrompt,
	seedDataLog,
	seedDataIf
]);

export type ExpandedSeedData = z.infer<typeof expandedSeedData>;

export type SeedDataType = ExpandedSeedData['type'];

export const expandedSeedPacket = z.object({
	version: z.literal(0),
	seeds: z.record(seedID, expandedSeedData)
});

export type ExpandedSeedPacket = z.infer<typeof expandedSeedPacket>;

//TODO: allow nesting of this type.
export const seedPacket = expandedSeedPacket;
export type SeedPacket = ExpandedSeedPacket;