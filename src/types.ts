import {
	z
} from 'zod';

import {
	TypedObject
} from './typed-object.js';

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

//we want a regexp, and z.string().url() does not use a URL so just munge one
const urlRegExp = new RegExp('((http(s)?:\\/\\/)?(www\\.)?(([a-zA-Z\\d-]+\\.)+[a-zA-Z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*(\\?[;&a-zA-Z\\d%_.~+=-]*)?(\\#[-a-zA-Z\\d_]*)?)');
const seedPacketAbsoluteLocationRegExp = new RegExp('(' + urlRegExp.source + ')|(' + absoluteLocalLocationRegExp.source + ')');
const packedSeedReferenceRegExp = new RegExp('(' + seedPacketAbsoluteLocationRegExp.source + '#)?' + seedIDRegExp.source);

export const packedSeedReference = z
	.string()
	.regex(absoluteRegExp(packedSeedReferenceRegExp))
	.describe('A packed SeedReference has the form `location#id`. The location must be absolute and if the location is omitted the # should also be');

export type PackedSeedReference = z.infer<typeof packedSeedReference>;

const seedDataBase = z.object({
	id: z.optional(seedID),
	description: z.optional(z.string().describe('An optional description for what a seed does'))
});


//Every key in SeedData that is not one of these keys is potentialy a
//SeedReference or SeedData.
export const seedDataReservedKeys = seedDataBase.keyof();

export type SeedDataReservedKeys = z.infer<typeof seedDataReservedKeys>;

const makeSeedReferenceProperty = <R extends z.ZodTypeAny>(input : R) => {
	return z.union([
		seedReference,
		input
	]);
};

const makeNestedSeedReferenceProperty = <R extends z.ZodTypeAny>(input : R) => {
	return z.union([
		z.lazy(() => seedData),
		seedReference,
		input
	]);
};

type SeedDataConfiguration<Kind extends z.ZodLiteral<string>, Shape extends z.ZodRawShape> = {
	type: Kind,
	properties: Shape
};

const makeNestedSeedData = <Kind extends z.ZodLiteral<string>, Shape extends z.ZodRawShape>(config : SeedDataConfiguration<Kind, Shape>) => {
	const entries = TypedObject.entries(config.properties).map(entry => [entry[0], makeNestedSeedReferenceProperty(entry[1])]);
	//Note: this cast is incorrect, there's actually three items in the union,
	//and the middle one is the seedData. But we can't reference it easily for
	//real because it's recursive and it's hard (impossible?) to do
	//auto-inferring of correct types with zod.infer this deep. That's OK, we'll
	//just have a type that erroneously excludes a few possibilities.
	//expandSeedData is the only place we'll have to check for it being a
	//SeedData even though we weren't technically aware it could be.
	//This problem is tracked in #16.
	const modifiedProperties = Object.fromEntries(entries) as {[k in keyof Shape] : z.ZodUnion<[typeof seedReference, Shape[k]]>};
	return seedDataBase.extend({
		type: config.type,
	}).extend(
		modifiedProperties
	);
};

const makeSeedData = <Kind extends z.ZodLiteral<string>, Shape extends z.ZodRawShape>(config : SeedDataConfiguration<Kind, Shape>) => {
	const entries = TypedObject.entries(config.properties).map(entry => [entry[0], makeSeedReferenceProperty(entry[1])]);
	const modifiedProperties = Object.fromEntries(entries) as {[k in keyof Shape] : z.ZodUnion<[typeof seedReference, Shape[k]]>};
	return seedDataBase.extend({
		type: config.type,
	}).extend(
		modifiedProperties
	);
};

/*
 *
 * Begin Seed Types
 * 
 */

const seedDataConfigPrompt = {
	type: z.literal('prompt'),
	properties: {
		prompt: z.string().describe('The full prompt to be passed to the configured commpletion_model')
	}
};

const nestedSeedDataPrompt = makeNestedSeedData(seedDataConfigPrompt);
const seedDataPrompt = makeSeedData(seedDataConfigPrompt);

export type SeedDataPrompt = z.infer<typeof seedDataPrompt>;

const seedDataConfigLog = {
	type: z.literal('log'),
	properties: {
		value: value.describe('The message to echo back')
	}
};

const nestedSeedDataLog = makeNestedSeedData(seedDataConfigLog);
const seedDataLog = makeSeedData(seedDataConfigLog);

export type SeedDataLog = z.infer<typeof seedDataLog>;

const seedDataConfigIf = {
	type: z.literal('if'),
	properties: {
		test: value.describe('The value to examine'),
		then: value.describe('The value to return if the value of test is truthy'),
		else: value.describe('The value to return if the value of test is falsy')
	}
};

const nestedSeedDataIf = makeNestedSeedData(seedDataConfigIf);
const seedDataIf = makeSeedData(seedDataConfigIf);

export type SeedDataIf = z.infer<typeof seedDataIf>;

const seedDataConfigEqual = {
	type: z.literal('=='),
	properties: {
		a: value.describe('The left hand side to compare'),
		b: value.describe('The right hand side to compare')
	}
};

const nestedSeedDataEqual = makeNestedSeedData(seedDataConfigEqual);
const seedDataEqual = makeSeedData(seedDataConfigEqual);

export type SeedDataEqual = z.infer<typeof seedDataEqual>;

const seedDataConfigNotEqual = {
	type: z.literal('!='),
	properties: {
		a: value.describe('The left hand side to compare'),
		b: value.describe('The right hand side to compare')
	}
};

const nestedSeedDataNotEqual = makeNestedSeedData(seedDataConfigNotEqual);
const seedDataNotEqual = makeSeedData(seedDataConfigNotEqual);

export type SeedDataNotEqual = z.infer<typeof seedDataNotEqual>;

const seedDataConfigLessThan = {
	type: z.literal('<'),
	properties: {
		a: value.describe('The left hand side to compare'),
		b: value.describe('The right hand side to compare')
	}
};

const nestedSeedDataLessThan = makeNestedSeedData(seedDataConfigLessThan);
const seedDataLessThan = makeSeedData(seedDataConfigLessThan);

export type SeedDataLessThan = z.infer<typeof seedDataLessThan>;

/*
 *
 * End Seed Types
 * 
 */

export const expandedSeedData = z.discriminatedUnion('type', [
	seedDataPrompt,
	seedDataLog,
	seedDataIf,
	seedDataEqual,
	seedDataNotEqual,
	seedDataLessThan
]);

export type ExpandedSeedData = z.infer<typeof expandedSeedData>;

export const seedData = z.discriminatedUnion('type', [
	nestedSeedDataPrompt,
	nestedSeedDataLog,
	nestedSeedDataIf,
	nestedSeedDataEqual,
	nestedSeedDataNotEqual,
	nestedSeedDataLessThan
]);

//Note that the typescript inferred type for this technically is missing the
//recursive nesting type. See the comment in makeNestedSeedData, issue #16.
export type SeedData = z.infer<typeof seedData>;

export type SeedDataType = ExpandedSeedData['type'];

export const expandedSeedPacket = z.object({
	version: z.literal(0),
	seeds: z.record(seedID, expandedSeedData)
});

export type ExpandedSeedPacket = z.infer<typeof expandedSeedPacket>;

export const seedPacket = z.object({
	version: z.literal(0),
	seeds: z.record(seedID, seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;