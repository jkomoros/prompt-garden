import {
	SeedDataLog,
	SeedDataIf,
	SeedDataPrompt,
	Value,
	SeedReference,
	SeedDataEqual,
	SeedDataNotEqual,
	SeedDataLessThan,
	SeedDataGreaterThan,
	SeedDataLessThanOrEqualTo,
	SeedDataGreaterThanOrEqualTo,
	SeedDataNot,
	seedReference,
	SeedDataRender,
	SeedDataInput,
	leafValue,
	SeedDataProperty,
	SeedDataObject,
	ValueObject,
	LeafValue,
	SeedDataVar,
	SeedDataExtract,
	SeedDataLet,
	SeedDataEmbed,
	knownEnvironmentSecretKey,
	SeedDataMemorize,
	SeedDataRecall,
	SeedDataTokenCount,
	SeedDataArray,
	ValueArray,
	SeedDataCompose,
	SeedDataStore,
	inputValue,
	SeedDataRetrieve,
	SeedDataDelete,
	arrayReturnType,
	SeedDataLetMulti,
	EnvironmentData,
	SeedDataNoop,
	SeedDataAdd,
	SeedDataMultiply,
	SeedDataDivide,
	SeedDataReference,
	SeedDataDynamic,
	SeedDataKeys,
	SeedDataMap,
	SeedDataThrow,
	SeedDataRandom,
	SeedDataRandomSeed,
	roundType,
	SeedDataSplit,
	SeedDataJoin,
	SeedDataFetch,
	fetchMethod,
	fetchFormat,
	SeedDataFilter,
	SeedDataFunction,
	SeedDataCall,
	argVarName,
	SeedDataEnumerate,
	enumerateResourceType,
	SeedDataSpread,
	SeedDataIndex,
	SeedDataSlice,
	InputOptions,
	choicesInput
} from './types.js';

import {
	assertUnreachable,
	getObjectProperty
} from './util.js';

import {
	isLocalLocation,
	locationDomain,
	makeSeedReferenceAbsolute,
	packSeedReference,
	unpackSeedReference
} from './reference.js';

import {
	Seed
} from './seed.js';

import {
	Template
} from './template.js';

import {
	Environment
} from './environment.js';

import {
	Embedding,
} from './embedding.js';

import {
	computeEmbedding,
	computeTokenCount,
	COMPLETIONS_BY_MODEL,
	computePrompt,
	randomEmbedding
} from './llm.js';

import {
	CalculationEvent
} from './calculation.js';

import {
	TypedObject
} from './typed-object.js';

const fetchSubSeed = async (parent : Seed, ref : SeedReference) : Promise<Seed> => {
	const absoluteRef = makeSeedReferenceAbsolute(ref, parent.location);
	return await parent.garden.seed(absoluteRef);
};

const growSubSeed = async (parent : Seed, env : Environment, ref : SeedReference) : Promise<Value> => {
	const seed = await fetchSubSeed(parent, ref);
	if (seed.private) {
		if (seed.location != parent.location) throw new Error(`${seed.id} is a private seed, it cannot be run from seed from a different packet ${parent.id}`);
	}
	return seed.grow(env, parent);
};

const getProperty = async (parent : Seed, env : Environment, input : Value | SeedReference | undefined, defaultValue? : Value) : Promise<Value> => {
	if (input === undefined) {
		if (defaultValue === undefined) return '';
		return defaultValue;
	}
	const seedRefResult = seedReference.safeParse(input);
	if (seedRefResult.success) {
		return await growSubSeed(parent, env, seedRefResult.data);
	}
	return input;
};

//This should be used any place you're trying to extract a string property. It automatically handles Embedding.
const extractString = (input : Value) : string => {
	if (input instanceof Embedding) return input.text;
	return String(input);
};

const growPrompt = async (seed : Seed<SeedDataPrompt>, env : Environment) : Promise<Value> => {

	const data = seed.data;

	const prompt = extractString(await getProperty(seed, env, data.prompt));

	return await computePrompt(prompt, env, seed.garden.profile);
};

const growEmbed = async (seed : Seed<SeedDataEmbed>, env : Environment) : Promise<Embedding> => {

	const data = seed.data;

	const text = extractString(await getProperty(seed, env, data.text));

	return computeEmbedding(text, env, seed.garden.profile);

};

const growMemorize = async (seed : Seed<SeedDataMemorize>, env : Environment) : Promise<Embedding | Embedding[]> => {

	const data = seed.data;

	const value = await getProperty(seed, env, data.value);

	const memoryInput = data.memory === undefined ? env.getKnownStringKey('memory') : String(await getProperty(seed, env, data.memory));

	const memory = env.getMemoryID(memoryInput);

	const isArray = Array.isArray(value);

	const values = isArray ? value : [value];
	const results : Embedding[] = [];

	for (const item of values) {

		const embedding = item instanceof Embedding ? item : await computeEmbedding(extractString(item), env, seed.garden.profile);

		//Check if the item is already memorized and if so skip
		let previous : Embedding[] = [];
		try {
			previous = await seed.garden.profile.recall(embedding, memory, 1);
		} catch(err) {
			//Totally fine, for example maybe there just aren't any memories yet.
		}

		if (previous && previous.length) {
			const first = previous[0];
			if (first.text == embedding.text) {
				seed.garden.profile.log(`Skipping memory because it was already memorized: ${embedding.text}`);
				continue;
			}
		}

		seed.garden.profile.memorize(embedding, memory);
	
		results.push(embedding);
	}

	return isArray ? results : results[0];

};

const growRecall = async (seed : Seed<SeedDataRecall>, env : Environment) : Promise<Embedding[]> => {

	const data = seed.data;

	let query = await getProperty(seed, env, data.query);

	if (query === null) query = randomEmbedding(env, env.getEmbeddingModel());

	const embedding = query instanceof Embedding ? query : await computeEmbedding(extractString(query), env, seed.garden.profile);

	const rawK = data.k === undefined ? 1 : data.k;

	const k = Number(await getProperty(seed, env, rawK));

	const memoryInput = data.memory === undefined ? env.getKnownStringKey('memory') : String(await getProperty(seed, env, data.memory));

	const memory = env.getMemoryID(memoryInput);

	return seed.garden.profile.recall(embedding, memory, k);

};

const growTokenCount = async (seed : Seed<SeedDataTokenCount>, env : Environment) : Promise<number | number[]> => {

	const data = seed.data;

	const text = await getProperty(seed, env, data.text);

	const isArray = Array.isArray(text);

	const texts = isArray ? text : [text];
	const results : number[] = [];

	for (const item of texts) {

		const text = item instanceof Embedding ? item.text : String(item);

		const count = await computeTokenCount(env, 'embedding', text, seed.garden.profile);

		results.push(count);
	}

	return isArray ? results : results[0];

};

const growLog = async (seed : Seed<SeedDataLog>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const value = await getProperty(seed, env, data.value);
	const mock = env.getKnownProtectedKey('mock');
	if (!mock) {
		seed.garden.profile.log(value);
	}
	return value;
};

const growNoop = async (seed : Seed<SeedDataNoop>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const value = await getProperty(seed, env, data.value);
	return value;
};

const growIf = async (seed : Seed<SeedDataIf>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const test = Boolean(await getProperty(seed, env, data.test));
	if (test) {
		return await getProperty(seed, env, data.then);
	}
	return await getProperty(seed, env, data.else);
};

const growEqual = async (seed : Seed<SeedDataEqual>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	return a == b;
};

const growNotEqual = async (seed : Seed<SeedDataNotEqual>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	return a != b;
};

const growLessThan = async (seed : Seed<SeedDataLessThan>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	if (a === null) throw new Error('a is null');
	if (b === null) throw new Error('b is null');

	return a < b;
};

const growGreaterThan = async (seed : Seed<SeedDataGreaterThan>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	if (a === null) throw new Error('a is null');
	if (b === null) throw new Error('b is null');
	return a > b;
};

const growLessThanOrEqualTo = async (seed : Seed<SeedDataLessThanOrEqualTo>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	if (a === null) throw new Error('a is null');
	if (b === null) throw new Error('b is null');
	return a <= b;
};

const growGreaterThanOrEqualTo = async (seed : Seed<SeedDataGreaterThanOrEqualTo>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	if (a === null) throw new Error('a is null');
	if (b === null) throw new Error('b is null');
	return a >= b;
};

const growAdd = async (seed : Seed<SeedDataAdd>, env : Environment) : Promise<number> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b, 1);
	if (typeof a != 'number') throw new Error('a is not a number');
	if (typeof b != 'number') throw new Error('b is not a number');
	return a + b;
};

const growMultiply = async (seed : Seed<SeedDataMultiply>, env : Environment) : Promise<number> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b, 1);
	if (typeof a != 'number') throw new Error('a is not a number');
	if (typeof b != 'number') throw new Error('b is not a number');
	return a * b;
};

const growDivide = async (seed : Seed<SeedDataDivide>, env : Environment) : Promise<number> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b, 1);
	if (typeof a != 'number') throw new Error('a is not a number');
	if (typeof b != 'number') throw new Error('b is not a number');
	//This will throw if b is 0
	return a / b;
};

const growNot = async (seed : Seed<SeedDataNot>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	return !a;
};

const growRender = async (seed : Seed<SeedDataRender>, env : Environment) : Promise<string> => {
	const data = seed.data;
	const templateString = extractString(await getProperty(seed, env, data.template));
	//TODO: also check if anything in vars is an embedding, not a string, and if so use embedding.text
	const vars = await getProperty(seed, env, data.vars);
	if (typeof vars != 'object') throw new Error('vars should be an object mapping properties to values');
	const template = new Template(templateString);
	return template.render(vars as Record<string, string>);
};

const growCompose = async (seed : Seed<SeedDataCompose>, env : Environment) : Promise<string> => {
	const data = seed.data;

	const prefix = extractString(await getProperty(seed, env, data.prefix, ''));
	const suffix = extractString(await getProperty(seed, env, data.suffix, ''));
	const delimiter = extractString(await getProperty(seed, env, data.delimiter, '\n'));

	const items = await getProperty(seed, env, data.items);
	if (!Array.isArray(items)) throw new Error('items must be an array');

	const model = env.getCompletionModel();

	const rawMaxTokens = await getProperty(seed, env, data.max_tokens, -1024);
	if (typeof rawMaxTokens != 'number') throw new Error('max_tokens must be a number if provided');
	let maxTokens = rawMaxTokens;
	if (maxTokens <= 0) {
		const modelMaxTokens = COMPLETIONS_BY_MODEL[model].maxTokens;
		maxTokens += modelMaxTokens;
	}

	let result = '';

	//we need to count the suffixTokens now to see how many items to include;
	let tokenCount = await computeTokenCount(env, 'completion', suffix, seed.garden.profile);

	if (prefix) {
		result += prefix;
		tokenCount += await computeTokenCount(env, 'completion', prefix, seed.garden.profile);
	}

	if (items.length) {
		const delimiterTokens = await computeTokenCount(env, 'completion', delimiter, seed.garden.profile);
		result += delimiter;
		tokenCount += delimiterTokens;
		for (const rawItem of items) {
			const item = extractString(rawItem);
			const nextTokenCount = delimiterTokens + await computeTokenCount(env, 'completion', item, seed.garden.profile);
			if (nextTokenCount + tokenCount > maxTokens) break;
			result += item;
			result += delimiter;
			tokenCount += nextTokenCount;
		}
	}

	if (suffix) {
		result += suffix;
		//We already added the tokenCount for suffix.
	}


	return result;
};

const growExtract = async (seed : Seed<SeedDataExtract>, env : Environment) : Promise<ValueObject> => {
	const data = seed.data;
	const templateString = extractString(await getProperty(seed, env, data.template));
	const template = new Template(templateString);
	const inputString = extractString(await getProperty(seed, env, data.input));
	//Technically template can give a thing not shaped like ValueObject, but, like, whatever.
	return template.extract(inputString) as ValueObject;
};

const growInput = async (seed : Seed<SeedDataInput>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const question = extractString(await getProperty(seed, env, data.question));
	const def = leafValue.parse(await getProperty(seed, env, data.default || ''));
	const mock = seed.garden.environment.getKnownProtectedKey('mock');
	if (mock) {
		return def;
	}
	const rawChoices = await getProperty(seed, env, data.choices, null);
	const choices = rawChoices ? choicesInput.parse(rawChoices) : undefined;
	const options : InputOptions = {
		multiLine: false,
		choices
	};
	return await seed.garden.profile.prompt(question, def, options);
};

const growReference = async (seed : Seed<SeedDataReference>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const id = extractString(await getProperty(seed, env, data.seed_id, ''));
	const rawPacket = extractString(await getProperty(seed, env, data.packet, ''));
	const absReference = makeSeedReferenceAbsolute({seed: id, packet: rawPacket}, seed.location);
	return packSeedReference(absReference);
};

const growDynamic = async (seed : Seed<SeedDataDynamic>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const ref = extractString(await getProperty(seed, env, data.reference, ''));
	if (!ref) throw new Error('empty reference');
	const unpackedRef = unpackSeedReference(ref);
	const allow_remote = Boolean(await getProperty(seed, env, data.allow_remote, false)) && !env.getKnownProtectedKey('disallow_remote');
	if (!allow_remote && !isLocalLocation(unpackedRef.packet)) throw new Error(`Cannot load a dynamic remote seed packet: ${unpackedRef.packet}`);
	return await growSubSeed(seed,env,unpackedRef);
};

const growFetch = async (seed : Seed<SeedDataFetch>, env : Environment) : Promise<string> => {
	const data = seed.data;

	if (env.getKnownProtectedKey('disallow_fetch')) throw new Error('Fetch is disabled because disallow_fetch is set to true');

	const resource = extractString(await getProperty(seed, env, data.resource, ''));
	if (!resource) throw new Error('no resource passed');
	const rawMethod = extractString(await getProperty(seed, env, data.method, 'GET'));
	const method = fetchMethod.parse(rawMethod.toUpperCase().trim());
	let body = null;
	if (method != 'GET') body = extractString(await getProperty(seed, env, data.body, ''));

	const rawFormat = extractString(await getProperty(seed, env, data.format, 'json'));
	const format = fetchFormat.parse(rawFormat.toLowerCase().trim());

	if (!isLocalLocation(seed.location)) {
		const domain = locationDomain(resource);
		const allowFetch = await seed.garden.profile.allowFetch(seed.location, domain);
		if (!allowFetch) throw new Error(`User did not allow fetch from ${seed.location} to ${domain}`);
	}

	let result = '';

	if (env.getKnownProtectedKey('mock')) {
		const data = {
			mock: true,
			resource,
			method,
			body,
			format
		};
		result = JSON.stringify(data);
	} else if (isLocalLocation(resource)) {
		//If it's a local fetch then use the localFetch machinery.
		//TODO: this logic will be wrong in cases where it's hosted on a domain
		result = await seed.garden.profile.localFetch(resource);
	} else {
		const fetchResult = await fetch(resource, {
			method,
			body
		});
		if (!fetchResult.ok) throw new Error(`Result status was not ok: ${fetchResult.status}: ${fetchResult.statusText}`);
		result = await fetchResult.text();
	}
	switch(format) {
	case 'json':
		return JSON.parse(result);
	case 'text':
		return result;
	default:
		assertUnreachable(format);
	}
	return result;

};

const growProperty = async (seed : Seed<SeedDataProperty>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const obj = await getProperty(seed, env, data.object);
	if (typeof obj !== 'object' || !obj) throw new Error('property requires object to be an object');
	const property = extractString(await getProperty(seed, env, data.property));
	//obj might be an object, an array, or even an embedding. Whatever!
	
	return getObjectProperty(obj as {[name : string]: unknown}, property) as Value;
};

const growKeys = async (seed : Seed<SeedDataKeys>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const obj = await getProperty(seed, env, data.object);
	if (typeof obj !== 'object' || !obj) return [];
	return Object.keys(obj);
};

const growObject = async (seed : Seed<SeedDataObject>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const result : ValueObject = {};
	for (const [key, value] of Object.entries(data.properties)) {
		//Cheat and pretned the return value is a LeafValue event hough it might not be 
		result[key] = await getProperty(seed, env, value) as LeafValue;
	}
	return result;
};

const growArray = async (seed : Seed<SeedDataArray>, env : Environment) : Promise<Value | ValueArray> => {
	const data = seed.data;
	const result : ValueArray = [];
	const items = data.items;
	if (!Array.isArray(items)) throw new Error('items must be an array');
	for (const item of items) {
		//Cheat and pretned the return value is a LeafValue event hough it might not be 
		result.push(await getProperty(seed, env, item) as LeafValue);
	}
	const returnType = arrayReturnType.parse(await getProperty(seed, env, data.return, 'all'));
	switch(returnType) {
	case 'all':
		return result;
	case 'first':
		if (result.length == 0) return null;
		return result[0];
	case 'last':
		if (result.length == 0) return null;
		return result[result.length - 1];
	default:
		assertUnreachable(returnType);
	}
	return result;
};

const growMap = async (seed : Seed<SeedDataMap>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const items = await getProperty(seed, env, data.items);
	if (typeof items !== 'object' || !items) return [];
	const result : {[key : string] : Value} | Value[] = Array.isArray(items) ? [] : {};
	const entries = Array.isArray(items) ? items.entries() : Object.entries(items);
	for (const [key, val] of entries) {
		const newEnv = env.clone({'key': key, 'value': val});
		const subResult = await getProperty(seed, newEnv, data.block);
		//note that because of how javascript treats arrays/objects, we could
		//set the string keys in arrays and it works correctly. However, we want
		//the keys to be numbers as users would expect

		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(result as any)[key] = subResult;
	}
	return result;
};

const growFilter = async (seed : Seed<SeedDataFilter>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const items = await getProperty(seed, env, data.items);
	if (typeof items !== 'object' || !items) return [];
	const result : {[key : string] : Value} | Value[] = Array.isArray(items) ? [] : {};
	const entries = Array.isArray(items) ? items.entries() : Object.entries(items);
	for (const [key, val] of entries) {
		const newEnv = env.clone({'key': key, 'value': val});
		const subResult = await getProperty(seed, newEnv, data.block);
		if (!subResult) continue;
		//note that because of how javascript treats arrays/objects, we could
		//set the string keys in arrays and it works correctly. However, we want
		//the keys to be numbers as users would expect

		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(result as any)[key] = val;
	}
	return result;
};

const growSpread = async (seed : Seed<SeedDataSpread>, env : Environment) : Promise<ValueArray | ValueObject> => {
	const data = seed.data;
	let a = await getProperty(seed, env, data.a);
	let b = await getProperty(seed, env, data.b);
	if (typeof a != 'object') a = [a];
	if (typeof b != 'object') b = [b];
	if (Array.isArray(a) && !Array.isArray(b)) throw new Error('a was array but b was not');
	if (!Array.isArray(a) && Array.isArray(b)) throw new Error('a was not array but b was');
	if (Array.isArray(a)) {
		if (!Array.isArray(b)) throw new Error('Satisfying typescript b is an array');
		return [...a, ...b];
	}
	return {
		...a,
		...b
	};
};

const growIndex = async (seed : Seed<SeedDataIndex>, env : Environment) : Promise<number | string | null> => {
	const data = seed.data;
	let container = await getProperty(seed, env, data.container);
	let search = await getProperty(seed, env, data.search);

	if (container instanceof Embedding) container = container.text;
	if (search instanceof Embedding) search = search.text;

	const reverse = await getProperty(seed, env, data.reverse, false);

	if (Array.isArray(container)) {
		if (reverse) {
			for (let i = container.length - 1; i >= 0; i--) {
				if (container[i] == search) return i;
			}
			return null;
		}
		for (let i = 0; i < container.length; i++) {
			if (container[i] == search) return i;
		}
		return null;
	}
	if (container && typeof container == 'object') {
		const entries = Object.entries(container);
		if (reverse) entries.reverse();
		for (const [key, value] of entries) {
			if (value == search) return key;
		}
		return null;
	}
	if (typeof container != 'string') throw new Error('container must be array, object, or string');
	if (typeof search != 'string') throw new Error('If container is string search must also be string');
	const result = reverse ? container.lastIndexOf(search) : container.indexOf(search);
	return result < 0 ? null : result;
};

const growSlice = async (seed : Seed<SeedDataSlice>, env : Environment) : Promise<ValueArray | string> => {
	const data = seed.data;
	let input = await getProperty(seed, env, data.input, null);
	if (input === null) throw new Error('input is a required property');
	if (input instanceof Embedding) input = input.text;
	if (!Array.isArray(input) && typeof input != 'string') throw new Error('input must be a string or array');

	const start = await getProperty(seed, env, data.start, 0);
	if (typeof start != 'number') throw new Error('start must be a number');
	const end = await getProperty(seed, env, data.end, Number.MAX_SAFE_INTEGER);
	if (typeof end != 'number') throw new Error('end must be a number');

	return input.slice(start, end);
};

const growSplit = async (seed : Seed<SeedDataSplit>, env : Environment) : Promise<ValueArray> => {
	const data = seed.data;
	const input = extractString(await getProperty(seed, env, data.input, null));
	if (typeof input != 'string') throw new Error('Split expects a string');
	const delimiter = extractString(await getProperty(seed, env, data.delimiter, '\n'));
	return input.split(delimiter);
};

const growJoin = async (seed : Seed<SeedDataJoin>, env : Environment) : Promise<string> => {
	const data = seed.data;
	const items = await getProperty(seed, env, data.items, null);
	if (!Array.isArray(items)) throw new Error('Split expects an array');
	const delimiter = extractString(await getProperty(seed, env, data.delimiter, ''));
	return items.join(delimiter);
};

const growThrow = async (seed : Seed<SeedDataThrow>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const error = extractString(await getProperty(seed, env, data.error, 'Unknown error'));
	throw new Error(error);
};

const growVar = async (seed : Seed<SeedDataVar>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const nameInput = extractString(await getProperty(seed, env, data.name));
	const name = env.getVarName(nameInput);
	//environment.get will properly refuse to get secretValues.
	const result = env.get(name);
	if (result === null) {
		return await getProperty(seed, env, data.else, null);
	}
	return result;
};

export const RANDOM_MOCK_VALUE = 0.732;

const growRandom = async (seed : Seed<SeedDataRandom>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const mock = env.getKnownProtectedKey('mock');
	const val = mock ? RANDOM_MOCK_VALUE : env.random();
	const choice = await getProperty(seed, env, data.choice, null);
	if (choice !== null) {
		if (!Array.isArray(choice)) throw new Error('If choice is provided it must be an array');
		if (choice.length == 0) throw new Error('Array has no values');
		return choice[Math.floor(val * choice.length)];
	}
	const min = Number(await getProperty(seed, env, data.min, 0.0));
	const max = Number(await getProperty(seed, env, data.max, 1.0));
	const base = (max - min) * val + min;
	const round = roundType.parse(await getProperty(seed, env, data.round, 'none'));
	switch (round) {
	case 'none':
		return base;
	case 'ceiling':
		return Math.ceil(base);
	case 'floor':
		return Math.floor(base);
	case 'round':
		return Math.round(base);
	default:
		assertUnreachable(round);
	}
	return base;
};

const growRandomSeed = async (seed : Seed<SeedDataRandomSeed>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const sd = extractString(await getProperty(seed, env, data.seed, Date.now()));
	const newEnv = env.cloneWithSeed(sd);
	return await getProperty(seed, newEnv, data.block);
};

const growLet = async (seed : Seed<SeedDataLet>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const nameInput = extractString(await getProperty(seed, env, data.name));
	const name = env.getVarName(nameInput);
	if (knownEnvironmentSecretKey.safeParse(name).success) throw new Error(`let may not set secret keys: ${name}`);
	const value = await getProperty(seed, env, data.value);
	const newEnv = env.clone({[name]: value});
	return await getProperty(seed, newEnv, data.block);
};

const growLetMulti = async (seed : Seed<SeedDataLetMulti>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	
	const values = await getProperty(seed, env, data.values);
	if (typeof values != 'object') throw new Error('Values must be an object');
	if (Array.isArray(values)) throw new Error('Values must be an object');
	if (!values) throw new Error('Values must be an object');
	const vars : EnvironmentData = {};
	for (const [key, val] of Object.entries(values)) {
		const processedKey = env.getVarName(key);
		if (knownEnvironmentSecretKey.safeParse(key).success) throw new Error(`let may not set secret keys: ${key}`);
		vars[processedKey] = val;
	}
	const newEnv = env.clone(vars);
	return await getProperty(seed, newEnv, data.block);
};

const growFunction = async (seed : Seed<SeedDataFunction>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	
	const values = await getProperty(seed, env, data.arguments);
	const defaults = await getProperty(seed, env, data.defaults, {});
	if (!Array.isArray(values)) throw new Error('Values must be an array');
	if (typeof defaults != 'object' || !defaults) throw new Error('Defaults, if provided, must be an object');
	if (Array.isArray(defaults)) throw new Error('defaults must not be an array');
	if (defaults instanceof Embedding) throw new Error('defaults must not be an embedding');

	const valuesAsArray = Object.fromEntries(values.map(item => [item, true]));
	for (const key of Object.keys(defaults)) {
		if (!valuesAsArray[key]) throw new Error(`Default for ${key} was set but it was not defined as argument`);
	}

	const newVars : EnvironmentData = {};
	for (const name of values) {
		if (typeof name != 'string') throw new Error('argument name must be string');
		if (!argVarName.safeParse(name).success) throw new Error('Arg must start with `arg:`');
		const val = env.get(name);
		if (val === null) {
			if (defaults[name] === undefined) throw new Error(`${val} was not set as expected`);
			newVars[name] = defaults[name];
		}
	}
	const newEnv = env.clone(newVars);
	return await getProperty(seed, newEnv, data.block);
};

const growCall = async (seed : Seed<SeedDataCall>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	
	const values = await getProperty(seed, env, data.arguments);
	if (typeof values != 'object') throw new Error('Values must be an object');
	if (Array.isArray(values)) throw new Error('Values must be an object');
	if (!values) throw new Error('Values must be an object');
	const vars : EnvironmentData = {};
	for (const [key, val] of Object.entries(values)) {
		if (!argVarName.safeParse(key).success) throw new Error(`${key} did not start with 'arg:'`);
		vars[key] = val;
	}
	const newEnv = env.clone(vars);

	if (!seedReference.safeParse(data.function).success) throw new Error('function must be a seed reference');

	const functionSeed = await fetchSubSeed(seed, data.function);

	if (functionSeed.type != 'function') throw new Error('Call can only call function sub-seeds');

	return await growSubSeed(seed, newEnv, data.function);
};

const growStore = async (seed : Seed<SeedDataStore>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const rawStoreID = extractString(await getProperty(seed, env, data.store, env.getKnownStringKey('store')));
	const storeID = env.getStoreID(rawStoreID);
	const key = extractString(await getProperty(seed, env, data.name));
	const value = inputValue.parse(await getProperty(seed, env, data.value));
	seed.garden.profile.store(storeID, key, value);
	return value;
};

const growRetrieve = async (seed : Seed<SeedDataRetrieve>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const rawStoreID = extractString(await getProperty(seed, env, data.store, env.getKnownStringKey('store')));
	const storeID = env.getStoreID(rawStoreID);
	const key = extractString(await getProperty(seed, env, data.name));
	const result = seed.garden.profile.retrieve(storeID, key);
	if (result === undefined) {
		return await getProperty(seed, env, data.else, null);
	}
	return result;
};

const growDelete = async (seed : Seed<SeedDataDelete>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const rawStoreID = extractString(await getProperty(seed, env, data.store, env.getKnownStringKey('store')));
	const storeID = env.getStoreID(rawStoreID);
	const key = extractString(await getProperty(seed, env, data.name));
	return seed.garden.profile.delete(storeID, key);
};

const growEnumerate = async (seed : Seed<SeedDataEnumerate>, env : Environment) : Promise<ValueArray> => {
	const data = seed.data;
	const rawResource = extractString(await getProperty(seed, env, data.resource));
	const resource = enumerateResourceType.parse(rawResource);
	switch (resource) {
	case 'stores':
		return seed.garden.profile.enumerateStores();
	case 'memories':
		return seed.garden.profile.enumerateMemories();
	default:
		return assertUnreachable(resource);
	}
};

//Returns the name of the property that this seed was referenced in the parent,
//or '' if it wasn't. NOTE: this is slow to do on enumeration each time; if
//there gets to be a performance bottleneck, we should simply pass through to
//growSubSeed what the parentProp was.
const parentProperty = (seed : Seed, parent? : Seed) : string => {
	if (!parent) return '';
	const packedRef = packSeedReference(seed.ref);
	const refs = parent.references();
	for (const [key, ref] of TypedObject.entries(refs)) {
		if (packSeedReference(ref) == packedRef) return key;
	}
	//seed.references() doesn't work for dynamic, so check ourselves.
	if (parent.type == 'dynamic') {
		//We'll assume it came from the dynamic property
		return 'reference';
	}
	return '';
};

export const grow = async (seed : Seed, env : Environment, parent? : Seed) : Promise<Value> => {
	const verbose = env.getKnownBooleanKey('verbose');
	const id = packSeedReference(seed.ref);
	if (verbose) {
		const json = JSON.stringify(seed.data, null, '\t');
		seed.garden.profile.log(`### Growing seed ${id}:\n\n${json}\n`);
	}
	const parentProp = parentProperty(seed, parent);
	if (env.calculation) {
		const start : CalculationEvent = {
			type: 'seed-start',
			ref: seed.ref
		};
		if (parent) {
			start.parent = {
				...parent.ref,
				property: parentProp
			};
		}
		env.calculation.push(start);
	}

	const data = seed.data;
	const typ = data.type;
	let result : Value = false;
	switch (typ) {
	case 'prompt':
		result = await growPrompt(seed as Seed<SeedDataPrompt>, env);
		break;
	case 'embed':
		result = await growEmbed(seed as Seed<SeedDataEmbed>, env);
		break;
	case 'memorize':
		result = await growMemorize(seed as Seed<SeedDataMemorize>, env);
		break;
	case 'recall':
		result = await growRecall(seed as Seed<SeedDataRecall>, env);
		break;
	case 'token_count':
		result = await growTokenCount(seed as Seed<SeedDataTokenCount>, env);
		break;
	case 'log':
		result = await growLog(seed as Seed<SeedDataLog>, env);
		break;
	case 'noop':
		result = await growNoop(seed as Seed<SeedDataNoop>, env);
		break;
	case 'if':
		result = await growIf(seed as Seed<SeedDataIf>, env);
		break;
	case '==':
		result = await growEqual(seed as Seed<SeedDataEqual>, env);
		break;
	case '!=':
		result = await growNotEqual(seed as Seed<SeedDataNotEqual>, env);
		break;
	case '<':
		result = await growLessThan(seed as Seed<SeedDataLessThan>, env);
		break;
	case '>':
		result = await growGreaterThan(seed as Seed<SeedDataGreaterThan>, env);
		break;
	case '<=':
		result = await growLessThanOrEqualTo(seed as Seed<SeedDataLessThanOrEqualTo>, env);
		break;
	case '>=':
		result = await growGreaterThanOrEqualTo(seed as Seed<SeedDataGreaterThanOrEqualTo>, env);
		break;
	case '!':
		result = await growNot(seed as Seed<SeedDataNot>, env);
		break;
	case '+':
		result = await growAdd(seed as Seed<SeedDataAdd>, env);
		break;
	case '*':
		result = await growMultiply(seed as Seed<SeedDataMultiply>, env);
		break;
	case '/':
		result = await growDivide(seed as Seed<SeedDataDivide>, env);
		break;
	case 'render':
		result = await growRender(seed as Seed<SeedDataRender>, env);
		break;
	case 'compose':
		result = await growCompose(seed as Seed<SeedDataCompose>, env);
		break;
	case 'extract':
		result = await growExtract(seed as Seed<SeedDataExtract>, env);
		break;
	case 'input':
		result = await growInput(seed as Seed<SeedDataInput>, env);
		break;
	case 'reference':
		result = await growReference(seed as Seed<SeedDataReference>, env);
		break;
	case 'dynamic':
		result = await growDynamic(seed as Seed<SeedDataDynamic>, env);
		break;
	case 'fetch':
		result = await growFetch(seed as Seed<SeedDataFetch>, env);
		break;
	case 'property':
		result = await growProperty(seed as Seed<SeedDataProperty>, env);
		break;
	case 'keys':
		result = await growKeys(seed as Seed<SeedDataKeys>, env);
		break;
	case 'object':
		result = await growObject(seed as Seed<SeedDataObject>, env);
		break;
	case 'array':
		result = await growArray(seed as Seed<SeedDataArray>, env);
		break;
	case 'map':
		result = await growMap(seed as Seed<SeedDataMap>, env);
		break;
	case 'filter':
		result = await growFilter(seed as Seed<SeedDataFilter>, env);
		break;
	case 'spread':
		result = await growSpread(seed as Seed<SeedDataSpread>, env);
		break;
	case 'index':
		result = await growIndex(seed as Seed<SeedDataIndex>, env);
		break;
	case 'slice':
		result = await growSlice(seed as Seed<SeedDataSlice>, env);
		break;
	case 'split':
		result = await growSplit(seed as Seed<SeedDataSplit>, env);
		break;
	case 'join':
		result = await growJoin(seed as Seed<SeedDataJoin>, env);
		break;
	case 'throw':
		result = await growThrow(seed as Seed<SeedDataThrow>, env);
		break;
	case 'var':
		result = await growVar(seed as Seed<SeedDataVar>, env);
		break;
	case 'random':
		result = await growRandom(seed as Seed<SeedDataRandom>, env);
		break;
	case 'random-seed':
		result = await growRandomSeed(seed as Seed<SeedDataRandomSeed>, env);
		break;
	case 'let':
		result = await growLet(seed as Seed<SeedDataLet>, env);
		break;
	case 'let-multi':
		result = await growLetMulti(seed as Seed<SeedDataLetMulti>, env);
		break;
	case 'function':
		result = await growFunction(seed as Seed<SeedDataFunction>, env);
		break;
	case 'call':
		result = await growCall(seed as Seed<SeedDataCall>, env);
		break;
	case 'store':
		result = await growStore(seed as Seed<SeedDataStore>, env);
		break;
	case 'retrieve':
		result = await growRetrieve(seed as Seed<SeedDataRetrieve>, env);
		break;
	case 'delete':
		result = await growDelete(seed as Seed<SeedDataDelete>, env);
		break;
	case 'enumerate':
		result = await growEnumerate(seed as Seed<SeedDataEnumerate>, env);
		break;
	default:
		return assertUnreachable(typ);
	}
	if (verbose) {
		const prettyResult = typeof result == 'object' ? JSON.stringify(result, null, '\t') : result;
		seed.garden.profile.log(`==> Returning value from ${id}:\n\n${prettyResult}\n`);
	}
	if (env.calculation) {
		const finish : CalculationEvent = {
			type: 'seed-finish',
			ref: seed.ref,
			result
		};
		if (parent) {
			finish.parent = {
				...parent.ref,
				property: parentProp
			};
		}
		env.calculation.push(finish);
	}
	return result;
};