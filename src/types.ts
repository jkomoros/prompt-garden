import {
	z
} from 'zod';

import {
	TypedObject
} from './typed-object.js';

import {
	Embedding
} from './embedding.js';

const CHANGE_ME_SENTINEL = 'CHANGE_ME';

//When changing, also change environment.SAMPLE.json
export const DEFAULT_PROFILE = '_default_profile';

export type MermaidDiagramDefinition = string;

export type RandomGenerator = () => number;

/*
 *
 * There are two value hiearachies: Value and InputValue. The former is used at
 * computation time and is a more expansive type, including for example
 * instanceOf(Embedding). The latter is the values that are allowed to be passed
 * in the JSON schema. It's more restrictive (specifically, excluding
 * instanceOf(embedding)) because it represents only the items that may legally
 * be passed in JSON (also, instanceOF polutes types with an `any-like` sceham,
 * matching everything). The more restrictive types also allow creating more
 * useful schemas for seed packets, so they will help fill in values and
 * validate more easily.
 *
 */

const genericIDRegExp = new RegExp('[a-zA-Z0-9-_]*');

const absoluteRegExp = (r : RegExp) : RegExp => {
	return new RegExp('^' + r.source + '$');
};

const genericID = z.string().regex(absoluteRegExp(genericIDRegExp));

const genericIDExtraRegExp = new RegExp('[a-zA-Z0-9-_.]*');

const genericExtraID = z.string().regex(absoluteRegExp(genericIDExtraRegExp));

const nonTypeRegExp = new RegExp('(?!type$)');

const nonTypeKey = z.string().regex(absoluteRegExp(new RegExp(nonTypeRegExp.source + genericIDExtraRegExp.source)));

export const namespace = z.string().regex(absoluteRegExp(genericIDExtraRegExp));

export type Namespace = z.infer<typeof namespace>;

export const NAMESPACE_DELIMITER = ':';

const namespacedIDRegExp = new RegExp(genericIDExtraRegExp.source + NAMESPACE_DELIMITER + '?' + genericIDExtraRegExp.source);

const namedspacedID = z.string().regex(absoluteRegExp(namespacedIDRegExp));

export type NamespacedID = z.infer<typeof namedspacedID>;

export const leafValue = z.union([
	z.null(),
	z.number(),
	z.string(),
	z.boolean(),
	z.instanceof(Embedding)
]);

export type LeafValue = z.infer<typeof leafValue>;

//We have to define these types manually because of the use of recursion and z.lazy(). Luckily they're easy to define.
export type ValueObject = {
	[key : string]: Value
};

export type ValueArray = Value[];

const valueObject : z.ZodType<ValueObject> = z.record(nonTypeKey, z.lazy(() => value));

const valueArray : z.ZodType<ValueArray> = z.array(z.lazy(() => value));

const value = z.union([
	leafValue,
	valueObject,
	valueArray
]);

export type Value = LeafValue | ValueObject | ValueArray;

const inputLeafValue = z.union([
	z.null(),
	z.number(),
	z.string(),
	z.boolean(),
]);

//We have to define these types manually because of the use of recursion and z.lazy(). Luckily they're easy to define.
export type InputLeafValue = z.infer<typeof inputLeafValue>;

export type InputValueObject = {
	[key : string] : InputValue
};

export type InputValueArray = InputValue[];

const inputValueObject : z.ZodType<InputValueObject> = z.record(nonTypeKey, z.lazy(() => z.union([seedData, seedReference, inputValue])));

const inputValueArray : z.ZodType<InputValueArray> = z.array(z.lazy(() => z.union([seedData, seedReference, inputValue])));

export const inputValue = z.union([
	inputLeafValue,
	inputValueObject,
	inputValueArray
]);

export type InputValue = InputLeafValue | InputValueObject | InputValueArray;

//In the vast majority of cases, we don't really want a value but a non-object
//value. Schema checking gets confused with sub-seeds otherwise; any sub-object
//might just be a ValueObject, so it stops helping fill in sub-seed properties.
const inputNonObjectValue = z.union([
	inputLeafValue,
	inputValueArray
]);

export const embeddingModelID = z.literal('openai.com:text-embedding-ada-002');

export type EmbeddingModelID = z.infer<typeof embeddingModelID>;

export const completionModelID = z.literal('openai.com:gpt-3.5-turbo');

export type CompletionModelID = z.infer<typeof completionModelID>;

export const modelProvider = z.literal('openai.com');

export type ModelProvider = z.infer<typeof modelProvider>;

const memoryID = namedspacedID;

export type MemoryID = z.infer<typeof memoryID>;

const storeID = namedspacedID;

export type StoreID = z.infer<typeof storeID>;

const storeKey = genericExtraID;

export type StoreKey = z.infer<typeof storeKey>;

export type StoreValue = z.infer<typeof inputValue>;

export const knownSecretEnvironmentData = z.object({
	openai_api_key: z.optional(z.string().refine((arg : string) => arg != CHANGE_ME_SENTINEL, {
		message: 'Required value was not changed from ' + CHANGE_ME_SENTINEL
	})),
	profile: z.optional(genericID)
});

const knownEnvironmentProtectedData = z.object({
	mock: z.optional(z.boolean()),
	disallow_remote: z.optional(z.boolean())
});

const knownEnvironmentNonSecretData = z.object({
	completion_model: z.optional(completionModelID),
	embedding_model: z.optional(embeddingModelID),
	memory: z.optional(memoryID),
	store: z.optional(storeID),
	verbose: z.optional(z.boolean()),
	namespace: z.optional(namespace),
	//These next two are not typically provided by an environment, but are used
	//by `map` to pass iteration information. Having them here means they won't
	//be namespaced, which would be annoying and error prone.
	key: z.optional(z.union([z.string(), z.number()])),
	value: z.optional(value),
});

//When updating, also change environment.SAMPLE.json
export const DEFAULT_STORE_ID = '_default_store';

const knownEnvironmentData = knownSecretEnvironmentData
	.merge(knownEnvironmentProtectedData)
	.merge(knownEnvironmentNonSecretData);

type KnownEnvironmentNonSecretData = z.infer<typeof knownEnvironmentNonSecretData>;

type KnownEnvironmentDataOfType<T, V> = {
    [K in keyof T as T[K] extends V ? K : never]: T[K]
};

export type KnownEnvironmentStringKey = keyof KnownEnvironmentDataOfType<Required<KnownEnvironmentNonSecretData>, string>;

export type KnownEnvironmentBooleanKey = keyof KnownEnvironmentDataOfType<Required<KnownEnvironmentNonSecretData>, boolean>;

export const knownEnvironmentKey = knownEnvironmentData.keyof();

export const knownEnvironmentSecretKey = knownSecretEnvironmentData.keyof();

export const knownEnvironmentProtectedKey = knownEnvironmentProtectedData.keyof();

export type KnownEnvironmentSecretKey = z.infer<typeof knownEnvironmentSecretKey>;

export type KnownEnvironmentProtectedKey = z.infer<typeof knownEnvironmentProtectedKey>;

export type KnownEnvironmentKey = keyof z.infer<typeof knownEnvironmentData>;

export const environmentData = knownEnvironmentData.catchall(value);

export type EnvironmentData = z.infer<typeof environmentData>;

const varName = z.union([
	knownEnvironmentKey,
	namedspacedID
]);

export type VarName = z.infer<typeof varName>;

export const seedID = genericID
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
	seed: seedID
});

export type SeedReference = z.infer<typeof seedReference>;

export const requiredSeedReference = z.object({
	packet: seedPacketAbsoluteLocation,
	seed: seedID
});

export type AbsoluteSeedReference = z.infer<typeof requiredSeedReference>;

//we want a regexp, and z.string().url() does not use a URL so just munge one
const urlRegExp = new RegExp('((http(s)?:\\/\\/)?(www\\.)?(([a-zA-Z\\d-]+\\.)+[a-zA-Z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*(\\?[;&a-zA-Z\\d%_.~+=-]*)?(\\#[-a-zA-Z\\d_]*)?)');
const seedPacketAbsoluteLocationRegExp = new RegExp('(' + urlRegExp.source + ')|(' + absoluteLocalLocationRegExp.source + ')');
const packedSeedReferenceRegExp = new RegExp('(' + seedPacketAbsoluteLocationRegExp.source + '#)?' + genericIDRegExp.source);

export const packedSeedReference = z
	.string()
	.regex(absoluteRegExp(packedSeedReferenceRegExp))
	.describe('A packed SeedReference has the form `location#id`. The location must be absolute and if the location is omitted the # should also be');

export type PackedSeedReference = z.infer<typeof packedSeedReference>;

const seedDataBase = z.object({
	id: z.optional(seedID),
	description: z.optional(z.string().describe('An optional description for what a seed does, sometimes shown to users')),
	comment: z.optional(z.string().describe('A string that is ignored, useful for internal comments')),
	private: z.optional(z.boolean()).describe('If marked as private, then seeds from a different packet won\'t be able to access this seed.')
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

const seedDataConfigEmbed = {
	type: z.literal('embed'),
	properties: {
		text: z.string().describe('The full text to be embedded')
	}
};

const nestedSeedDataEmbed = makeNestedSeedData(seedDataConfigEmbed);
const seedDataEmbed = makeSeedData(seedDataConfigEmbed);

export type SeedDataEmbed = z.infer<typeof seedDataEmbed>;

const textOrArray = z.union([
	z.string(),
	z.array(z.string())
]);


const seedDataConfigMemorize = {
	type: z.literal('memorize'),
	properties: {
		value: textOrArray.describe('Either a pre-computed embedding or text to be converted to a memory'),
		memory: memoryID.optional().describe('The name of the memory to use. If not provided, defaults to environment.memory')
	}
};

const nestedSeedDataMemorize= makeNestedSeedData(seedDataConfigMemorize);
const seedDataMemorize = makeSeedData(seedDataConfigMemorize);

export type SeedDataMemorize = z.infer<typeof seedDataMemorize>;

const seedDataConfigRecall = {
	type: z.literal('recall'),
	properties: {
		query: textOrArray.describe('Either a pre-computed embedding or text to be used as a query'),
		k: z.number().int().optional().describe('The number of results to return'),
		memory: memoryID.optional().describe('The name of the memory to use. If not provided, defaults to environment.memory')
	}
};

const nestedSeedDataRecall= makeNestedSeedData(seedDataConfigRecall);
const seedDataRecall = makeSeedData(seedDataConfigRecall);

export type SeedDataRecall = z.infer<typeof seedDataRecall>;

const seedDataConfigTokenCount = {
	type: z.literal('token_count'),
	properties: {
		text: textOrArray.describe('Either a pre-computed embedding or text to count the tokens in'),
	}
};

const nestedSeedDataTokenCount = makeNestedSeedData(seedDataConfigTokenCount);
const seedDataTokenCount = makeSeedData(seedDataConfigTokenCount);

export type SeedDataTokenCount = z.infer<typeof seedDataTokenCount>;

const seedDataConfigLog = {
	type: z.literal('log'),
	properties: {
		value: inputValue.describe('The message to echo back')
	}
};

const nestedSeedDataLog = makeNestedSeedData(seedDataConfigLog);
const seedDataLog = makeSeedData(seedDataConfigLog);

export type SeedDataLog = z.infer<typeof seedDataLog>;

const seedDataConfigNoop = {
	type: z.literal('noop'),
	properties: {
		value: inputValue.describe('The value to return')
	}
};

const nestedSeedDataNoop = makeNestedSeedData(seedDataConfigNoop);
const seedDataNoop = makeSeedData(seedDataConfigNoop);

export type SeedDataNoop = z.infer<typeof seedDataNoop>;

const seedDataConfigIf = {
	type: z.literal('if'),
	properties: {
		test: z.boolean().describe('The value to examine'),
		then: inputNonObjectValue.describe('The value to return if the value of test is truthy'),
		else: inputNonObjectValue.describe('The value to return if the value of test is falsy')
	}
};

const nestedSeedDataIf = makeNestedSeedData(seedDataConfigIf);
const seedDataIf = makeSeedData(seedDataConfigIf);

export type SeedDataIf = z.infer<typeof seedDataIf>;

const seedDataConfigEqual = {
	type: z.literal('=='),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to compare'),
		b: inputNonObjectValue.describe('The right hand side to compare')
	}
};

const nestedSeedDataEqual = makeNestedSeedData(seedDataConfigEqual);
const seedDataEqual = makeSeedData(seedDataConfigEqual);

export type SeedDataEqual = z.infer<typeof seedDataEqual>;

const seedDataConfigNotEqual = {
	type: z.literal('!='),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to compare'),
		b: inputNonObjectValue.describe('The right hand side to compare')
	}
};

const nestedSeedDataNotEqual = makeNestedSeedData(seedDataConfigNotEqual);
const seedDataNotEqual = makeSeedData(seedDataConfigNotEqual);

export type SeedDataNotEqual = z.infer<typeof seedDataNotEqual>;

const seedDataConfigLessThan = {
	type: z.literal('<'),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to compare'),
		b: inputNonObjectValue.describe('The right hand side to compare')
	}
};

const nestedSeedDataLessThan = makeNestedSeedData(seedDataConfigLessThan);
const seedDataLessThan = makeSeedData(seedDataConfigLessThan);

export type SeedDataLessThan = z.infer<typeof seedDataLessThan>;

const seedDataConfigGreaterThan = {
	type: z.literal('>'),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to compare'),
		b: inputNonObjectValue.describe('The right hand side to compare')
	}
};

const nestedSeedDataGreaterThan = makeNestedSeedData(seedDataConfigGreaterThan);
const seedDataGreaterThan = makeSeedData(seedDataConfigGreaterThan);

export type SeedDataGreaterThan = z.infer<typeof seedDataGreaterThan>;

const seedDataConfigLessThanOrEqualTo = {
	type: z.literal('<='),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to compare'),
		b: inputNonObjectValue.describe('The right hand side to compare')
	}
};

const nestedSeedDataLessThanOrEqualTo = makeNestedSeedData(seedDataConfigLessThanOrEqualTo);
const seedDataLessThanOrEqualTo = makeSeedData(seedDataConfigLessThanOrEqualTo);

export type SeedDataLessThanOrEqualTo = z.infer<typeof seedDataLessThanOrEqualTo>;

const seedDataConfigGreaterThanOrEqualTo = {
	type: z.literal('>='),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to compare'),
		b: inputNonObjectValue.describe('The right hand side to compare')
	}
};

const nestedSeedDataGreaterThanOrEqaulTo = makeNestedSeedData(seedDataConfigGreaterThanOrEqualTo);
const seedDataGreaterThanOrEqualTo = makeSeedData(seedDataConfigGreaterThanOrEqualTo);

export type SeedDataGreaterThanOrEqualTo = z.infer<typeof seedDataGreaterThanOrEqualTo>;

const seedDataConfigNot = {
	type: z.literal('!'),
	properties: {
		a: inputNonObjectValue.describe('The left hand side to negate'),
	}
};

const nestedSeedDataNot = makeNestedSeedData(seedDataConfigNot);
const seedDataNot = makeSeedData(seedDataConfigNot);

export type SeedDataNot = z.infer<typeof seedDataNot>;

const seedDataConfigAdd = {
	type: z.literal('+'),
	properties: {
		a: inputNonObjectValue.describe('The left hand side'),
		b: inputNonObjectValue.optional().describe('The right hand side')
	}
};

const nestedSeedDataAdd = makeNestedSeedData(seedDataConfigAdd);
const seedDataAdd = makeSeedData(seedDataConfigAdd);

export type SeedDataAdd = z.infer<typeof seedDataAdd>;

const seedDataConfigMultiply = {
	type: z.literal('*'),
	properties: {
		a: inputNonObjectValue.describe('The left hand side'),
		b: inputNonObjectValue.optional().describe('The right hand side')
	}
};

const nestedSeedDataMultiply = makeNestedSeedData(seedDataConfigMultiply);
const seedDataMultiply = makeSeedData(seedDataConfigMultiply);

export type SeedDataMultiply = z.infer<typeof seedDataMultiply>;

const seedDataConfigDivide = {
	type: z.literal('/'),
	properties: {
		a: inputNonObjectValue.describe('The left hand side'),
		b: inputNonObjectValue.describe('The right hand side')
	}
};

const nestedSeedDataDivide = makeNestedSeedData(seedDataConfigDivide);
const seedDataDivide = makeSeedData(seedDataConfigDivide);

export type SeedDataDivide = z.infer<typeof seedDataDivide>;

const seedDataConfigRender = {
	type: z.literal('render'),
	properties: {
		template: z.string().describe('The template string to replace {{ vars }} in '),
		vars: inputValueObject
	}
};

const nestedSeedDataRender = makeNestedSeedData(seedDataConfigRender);
const seedDataRender = makeSeedData(seedDataConfigRender);

export type SeedDataRender = z.infer<typeof seedDataRender>;

const seedDataConfigCompose = {
	type: z.literal('compose'),
	properties: {
		prefix: z.string().optional().describe('The prefix to the prompt to use'),
		suffix: z.string().optional().describe('The suffix to the prompt to include'),
		delimiter: z.string().optional().describe('The delimiter between items to use'),
		items: textOrArray.describe('The list of items to include'),
		max_tokens: z.number().int().optional().describe('The maximum number of tokens to include. If the number is 0 or lower, it will be added to the maximum number of tokens for the current completion_model limit.')
	}
};

const nestedSeedDataCompose = makeNestedSeedData(seedDataConfigCompose);
const seedDataCompose = makeSeedData(seedDataConfigCompose);

export type SeedDataCompose = z.infer<typeof seedDataCompose>;

const seedDataConfigExtract = {
	type: z.literal('extract'),
	properties: {
		template: z.string().describe('The template string to extract {{ vars }} from'),
		input: z.string().describe('The string to match against the template')
	}
};

const nestedSeedDataExtract = makeNestedSeedData(seedDataConfigExtract);
const seedDataExtract = makeSeedData(seedDataConfigExtract);

export type SeedDataExtract = z.infer<typeof seedDataExtract>;

const seedDataConfigInput = {
	type: z.literal('input'),
	properties: {
		question: z.string().describe('The question to ask the user'),
		default: z.string().optional().describe('The value to use as default if the user doesn\'t provide anything else')
	}
};

const nestedSeedDataInput = makeNestedSeedData(seedDataConfigInput);
const seedDataInput = makeSeedData(seedDataConfigInput);

export type SeedDataInput = z.infer<typeof seedDataInput>;

const seedDataConfigReference = {
	type: z.literal('reference'),
	properties: {
		//Note this has to not be `seed` so other machinery doesn't think this is a seed reference.
		seed_id: z.string().optional().describe('The id of the seed to include in the reference'),
		packet: z.string().optional().describe('The location of the packet, can be a relative location')
	}
};

const nestedSeedDataReference = makeNestedSeedData(seedDataConfigReference);
const seedDataReference = makeSeedData(seedDataConfigReference);

export type SeedDataReference = z.infer<typeof seedDataReference>;

const seedDataConfigDynamic = {
	type: z.literal('dynamic'),
	properties: {
		reference: z.string().describe('The packed ID of the seed to reference'),
		allow_remote: z.boolean().optional().describe('If true, then remote seed fetches will be allowed')
	}
};

const nestedSeedDataDynamic = makeNestedSeedData(seedDataConfigDynamic);
const seedDataDynamic = makeSeedData(seedDataConfigDynamic);

export type SeedDataDynamic = z.infer<typeof seedDataDynamic>;

const seedDataConfigKeys = {
	type: z.literal('keys'),
	properties: {
		object: inputValue.describe('The object whose keys to take')
	}
};

const nestedSeedDataKeys = makeNestedSeedData(seedDataConfigKeys);
const seedDataKeys = makeSeedData(seedDataConfigKeys);

export type SeedDataKeys = z.infer<typeof seedDataKeys>;

const seedDataConfigProperty = {
	type: z.literal('property'),
	properties: {
		object: inputValueObject.describe('The object to select a property from'),
		property: z.string().describe('The property to extract')
	}
};

const nestedSeedDataProperty = makeNestedSeedData(seedDataConfigProperty);
const seedDataProperty = makeSeedData(seedDataConfigProperty);

export type SeedDataProperty = z.infer<typeof seedDataProperty>;


//Object is special in that even sub-keys of a property might need to be
//computed, so handle its definition manually.
const seedDataObject = seedDataBase.extend({
	type: z.literal('object'),
	properties: z.record(genericExtraID, makeSeedReferenceProperty(inputValue))
});

const lazySeedData = z.lazy(() => seedData) as never;

export const nestedSeedDataObject = seedDataBase.extend({
	type: z.literal('object'),
	properties: z.record(genericExtraID, z.union([
		lazySeedData,
		seedReference,
		inputValue
	]))
});

export type SeedDataObject = z.infer<typeof seedDataObject>;

export const arrayReturnType = z.union([z.literal('first'), z.literal('last'), z.literal('all')]);

const arrayReturn = arrayReturnType.optional().describe('Which items to return');

//Aray is special in that even sub-keys of a property might need to be
//computed, so handle its definition manually.
const seedDataArray = seedDataBase.extend({
	type: z.literal('array'),
	items: z.array(makeSeedReferenceProperty(inputValue)),
	return: arrayReturn
});

export const nestedSeedDataArray = seedDataBase.extend({
	type: z.literal('array'),
	items: z.array(z.union([
		lazySeedData,
		seedReference,
		inputValue
	])),
	return: z.union([
		lazySeedData,
		seedReference,
		arrayReturn
	])
});

export type SeedDataArray = z.infer<typeof seedDataArray>;

const seedDataConfigMap = {
	type: z.literal('map'),
	properties: {
		items: inputValue.describe('The items to iterate over'),
		block: inputValue.describe('The statement to execute for each item')
	}
};

const nestedSeedDataMap = makeNestedSeedData(seedDataConfigMap);
const seedDataMap = makeSeedData(seedDataConfigMap);

export type SeedDataMap = z.infer<typeof seedDataMap>;

const seedDataConfigThrow = {
	type: z.literal('throw'),
	properties: {
		error: z.string().describe('The message to show')
	}
};

const nestedSeedDataThrow = makeNestedSeedData(seedDataConfigThrow);
const seedDataThrow = makeSeedData(seedDataConfigThrow);

export type SeedDataThrow = z.infer<typeof seedDataThrow>;

const seedDataConfigVar = {
	type: z.literal('var'),
	properties: {
		name: varName.describe('The name of the variable in environment to fetch'),
		else: inputValue.optional().describe('The sub-expression to execute to get a value if value is undefined'),
	}
};

const nestedSeedDataVar = makeNestedSeedData(seedDataConfigVar);
const seedDataVar = makeSeedData(seedDataConfigVar);

export type SeedDataVar = z.infer<typeof seedDataVar>;

const seedDataConfigRandom = {
	type: z.literal('random'),
	properties: {
		min: z.number().optional().describe('An optional lower bound, defaults to 0.0'),
		max: z.number().optional().describe('An optional upper bound, defaults to 1.0')
	}
};

const nestedSeedDataRandom = makeNestedSeedData(seedDataConfigRandom);
const seedDataRandom = makeSeedData(seedDataConfigRandom);

export type SeedDataRandom = z.infer<typeof seedDataRandom>;

const seedDataConfigRandomSeed = {
	type: z.literal('random-seed'),
	properties: {
		seed: z.string().optional().describe('The seed to use for random sub-seeds within block'),
		block: inputNonObjectValue.describe('The sub-expressions in which the random seed will be changed')
	}
};

const nestedSeedDataRandomSeed = makeNestedSeedData(seedDataConfigRandomSeed);
const seedDataRandomSeed = makeSeedData(seedDataConfigRandomSeed);

export type SeedDataRandomSeed = z.infer<typeof seedDataRandomSeed>;

const seedDataConfigLet = {
	type: z.literal('let'),
	properties: {
		name: varName.describe('The name of the variable in environment to set'),
		value: inputNonObjectValue.describe('The value to set the named variable to'),
		block: inputNonObjectValue.describe('The sub-expression where name=value will be set in environment')
	}
};

const nestedSeedDataLet = makeNestedSeedData(seedDataConfigLet);
const seedDataLet = makeSeedData(seedDataConfigLet);

export type SeedDataLet = z.infer<typeof seedDataLet>;

const seedDataConfigLetMulti = {
	type: z.literal('let-multi'),
	properties: {
		values: z.record(varName, inputValue).describe('The map of name -> variables to set'),
		block: inputNonObjectValue.describe('The sub-expression where name=value will be set in environment')
	}
};

const nestedSeedDataLetMulti = makeNestedSeedData(seedDataConfigLetMulti);
const seedDataLetMulti = makeSeedData(seedDataConfigLetMulti);

export type SeedDataLetMulti = z.infer<typeof seedDataLetMulti>;

const seedDataConfigStore = {
	type: z.literal('store'),
	properties: {
		store: storeID.optional().describe('The store ID to use'),
		name: storeKey.describe('The name of the variable in environment to store'),
		value: inputValue.describe('The value to store')
	}
};

const nestedSeedDataStore = makeNestedSeedData(seedDataConfigStore);
const seedDataStore = makeSeedData(seedDataConfigStore);

export type SeedDataStore = z.infer<typeof seedDataStore>;

const seedDataConfigRetrieve = {
	type: z.literal('retrieve'),
	properties: {
		store: storeID.optional().describe('The store ID to use'),
		name: storeKey.describe('The name of the variable in environment to retrieve'),
		else: inputValue.optional().describe('The sub-expression to execute to get a value if value is undefined'),
	}
};

const nestedSeedDataRetrieve = makeNestedSeedData(seedDataConfigRetrieve);
const seedDataRetrieve = makeSeedData(seedDataConfigRetrieve);

export type SeedDataRetrieve = z.infer<typeof seedDataRetrieve>;

const seedDataConfigDelete = {
	type: z.literal('delete'),
	properties: {
		store: storeID.optional().describe('The store ID to use'),
		name: storeKey.describe('The name of the variable in environment to delete'),
	}
};

const nestedSeedDataDelete = makeNestedSeedData(seedDataConfigDelete);
const seedDataDelete = makeSeedData(seedDataConfigDelete);

export type SeedDataDelete = z.infer<typeof seedDataDelete>;

/*
 *
 * End Seed Types
 * 
 */

export const expandedSeedData = z.discriminatedUnion('type', [
	seedDataPrompt,
	seedDataEmbed,
	seedDataMemorize,
	seedDataRecall,
	seedDataTokenCount,
	seedDataLog,
	seedDataNoop,
	seedDataIf,
	seedDataEqual,
	seedDataNotEqual,
	seedDataLessThan,
	seedDataGreaterThan,
	seedDataLessThanOrEqualTo,
	seedDataGreaterThanOrEqualTo,
	seedDataNot,
	seedDataAdd,
	seedDataMultiply,
	seedDataDivide,
	seedDataRender,
	seedDataCompose,
	seedDataExtract,
	seedDataInput,
	seedDataReference,
	seedDataDynamic,
	seedDataKeys,
	seedDataProperty,
	seedDataObject,
	seedDataArray,
	seedDataMap,
	seedDataThrow,
	seedDataVar,
	seedDataRandom,
	seedDataRandomSeed,
	seedDataLet,
	seedDataLetMulti,
	seedDataStore,
	seedDataRetrieve,
	seedDataDelete
]);

export type ExpandedSeedData = z.infer<typeof expandedSeedData>;

export const seedData = z.discriminatedUnion('type', [
	nestedSeedDataPrompt,
	nestedSeedDataEmbed,
	nestedSeedDataMemorize,
	nestedSeedDataRecall,
	nestedSeedDataTokenCount,
	nestedSeedDataLog,
	nestedSeedDataNoop,
	nestedSeedDataIf,
	nestedSeedDataEqual,
	nestedSeedDataNotEqual,
	nestedSeedDataLessThan,
	nestedSeedDataGreaterThan,
	nestedSeedDataLessThanOrEqualTo,
	nestedSeedDataGreaterThanOrEqaulTo,
	nestedSeedDataNot,
	nestedSeedDataAdd,
	nestedSeedDataMultiply,
	nestedSeedDataDivide,
	nestedSeedDataRender,
	nestedSeedDataCompose,
	nestedSeedDataExtract,
	nestedSeedDataInput,
	nestedSeedDataReference,
	nestedSeedDataDynamic,
	nestedSeedDataKeys,
	nestedSeedDataProperty,
	nestedSeedDataObject,
	nestedSeedDataArray,
	nestedSeedDataMap,
	nestedSeedDataThrow,
	nestedSeedDataVar,
	nestedSeedDataRandom,
	nestedSeedDataRandomSeed,
	nestedSeedDataLet,
	nestedSeedDataLetMulti,
	nestedSeedDataStore,
	nestedSeedDataRetrieve,
	nestedSeedDataDelete
]);

//Note that the typescript inferred type for this technically is missing the
//recursive nesting type. See the comment in makeNestedSeedData, issue #16.
export type SeedData = z.infer<typeof seedData>;

export type SeedDataType = ExpandedSeedData['type'];

export const expandedSeedPacket = z.object({
	version: z.literal(0),
	environment: environmentData,
	seeds: z.record(seedID, expandedSeedData)
});

export type ExpandedSeedPacket = z.infer<typeof expandedSeedPacket>;

export const seedPacket = z.object({
	version: z.literal(0),
	environment: z.optional(environmentData).describe('If provided, will overlay the starter environment for every seed in this packet'),
	seeds: z.record(seedID, seedData)
});

export type SeedPacket = z.infer<typeof seedPacket>;

const rawEmbeddingVector = z.array(z.number());

export type RawEmbeddingVector = z.infer<typeof rawEmbeddingVector>;

export const ADA_2_EMBEDDING_LENGTH = 1536;

export const rawEmbeddingVectorAda2 = rawEmbeddingVector.length(ADA_2_EMBEDDING_LENGTH);

export type RawEmbeddingVectorAda2 = z.infer<typeof rawEmbeddingVectorAda2>;