import {
	SeedDataLog,
	SeedDataIf,
	SeedDataPrompt,
	Value,
	completionModelID,
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
	embeddingModelID,
	ADA_2_EMBEDDING_LENGTH,
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
	SeedDataKeys
} from './types.js';

import {
	assertUnreachable,
	mockedResult
} from './util.js';

import {
	Configuration,
	OpenAIApi
} from 'openai';

import {
	isLocalLocation,
	makeAbsolute,
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
	COMPLETIONS_BY_MODEL,
	Embedding,
	EmbeddingAda2
} from './embedding.js';

import {
	countTokens, extractModel
} from './token_count.js';

const growSubSeed = async (parent : Seed, env : Environment, ref : SeedReference) : Promise<Value> => {
	const absoluteRef = makeAbsolute(ref, parent.location);
	const seed = await parent.garden.seed(absoluteRef);
	if (seed.private) {
		if (seed.location != parent.location) throw new Error(`${seed.id} is a private seed, it cannot be run from seed from a different packet ${parent.id}`);
	}
	return seed.grow(env);
};

const getProperty = async (parent : Seed, env : Environment, input : Value | SeedReference | undefined, defaultValue? : Value) : Promise<Value> => {
	if (input === undefined) {
		if (defaultValue === undefined) return '';
		return defaultValue;
	}
	if (seedReference.safeParse(input).success) {
		return await growSubSeed(parent, env, input as SeedReference);
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

	//Throw if the completion model is not a valid value
	const model = completionModelID.parse(env.getKnownKey('completion_model'));

	const [provider, modelName] = extractModel(model);

	//Check to make sure it's a known model in a way that will warn when we add new models.
	switch(provider) {
	case 'openai.com':
		//OK
		break;
	default:
		assertUnreachable(provider);
	}

	const apiKey = env.getKnownSecretKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const prompt = extractString(await getProperty(seed, env, data.prompt));

	const mock = env.getKnownBooleanKey('mock');
	if (mock) {
		return mockedResult(prompt);
	}

	const configuration = new Configuration({
		apiKey
	});

	const openai = new OpenAIApi(configuration);

	const result = await openai.createChatCompletion({
		model: modelName,
		messages: [
			{
				role: 'user',
				content: prompt
			}
		]
		//TODO: allow passing other parameters
	});

	return result.data.choices[0].message?.content || '';
};

const computeEmbedding = async (text : string, env : Environment) : Promise<Embedding> => {
	//Throw if the embedding model is not a valid value
	const model = embeddingModelID.parse(env.getKnownKey('embedding_model'));

	const [provider, modelName] = extractModel(model);

	//Check to make sure it's a known model in a way that will warn when we add new models.
	switch(provider) {
	case 'openai.com':
		//OK
		break;
	default:
		assertUnreachable(provider);
	}

	const apiKey = env.getKnownSecretKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const mock = env.getKnownBooleanKey('mock');
	if (mock) {
		const fakeVector : number[] = [];
		for (let i = 0; i < ADA_2_EMBEDDING_LENGTH; i ++) {
			fakeVector.push(Math.random());
		}
		//TODO: should there be a mock:true or some other way of telling it was mocked?
		return new EmbeddingAda2(fakeVector, text);
	}

	const configuration = new Configuration({
		apiKey
	});

	const openai = new OpenAIApi(configuration);

	const result = await openai.createEmbedding({
		model: modelName,
		input: text
		//TODO: allow passing other parameters
	});

	const vector = result.data.data[0].embedding;

	return new EmbeddingAda2(vector, text);
};

const growEmbed = async (seed : Seed<SeedDataEmbed>, env : Environment) : Promise<Embedding> => {

	const data = seed.data;

	const text = extractString(await getProperty(seed, env, data.text));

	return computeEmbedding(text, env);

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

		const embedding = item instanceof Embedding ? item : await computeEmbedding(extractString(item), env);

		seed.garden.profile.memorize(embedding, memory);
	
		results.push(embedding);
	}

	return isArray ? results : results[0];

};

const growRecall = async (seed : Seed<SeedDataRecall>, env : Environment) : Promise<Embedding[]> => {

	const data = seed.data;

	const query = await getProperty(seed, env, data.query);

	const embedding = query instanceof Embedding ? query : await computeEmbedding(extractString(query), env);

	const rawK = data.k === undefined ? 1 : data.k;

	const k = Number(await getProperty(seed, env, rawK));

	const memoryInput = data.memory === undefined ? env.getKnownStringKey('memory') : String(await getProperty(seed, env, data.memory));

	const memory = env.getMemoryID(memoryInput);

	return seed.garden.profile.recall(embedding, memory, k);

};

const growTokenCount = async (seed : Seed<SeedDataTokenCount>, env : Environment) : Promise<number | number[]> => {

	const data = seed.data;

	const text = await getProperty(seed, env, data.text);

	const model = embeddingModelID.parse(env.getKnownStringKey('embedding_model'));

	const isArray = Array.isArray(text);

	const texts = isArray ? text : [text];
	const results : number[] = [];

	for (const item of texts) {

		const text = item instanceof Embedding ? item.text : String(item);

		const count = await countTokens(model, text);

		results.push(count);
	}

	return isArray ? results : results[0];

};

const growLog = async (seed : Seed<SeedDataLog>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const value = await getProperty(seed, env, data.value);
	const mock = env.getKnownBooleanKey('mock');
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

	const model = completionModelID.parse(env.getKnownStringKey('completion_model'));

	const rawMaxTokens = await getProperty(seed, env, data.max_tokens, -1024);
	if (typeof rawMaxTokens != 'number') throw new Error('max_tokens must be a number if provided');
	let maxTokens = rawMaxTokens;
	if (maxTokens <= 0) {
		const modelMaxTokens = COMPLETIONS_BY_MODEL[model].maxTokens;
		maxTokens += modelMaxTokens;
	}

	let result = '';

	//we need to count the suffixTokens now to see how many items to include;
	let tokenCount = await countTokens(model, suffix);

	if (prefix) {
		result += prefix;
		tokenCount += await countTokens(model, prefix);
	}

	if (items.length) {
		const delimiterTokens = await countTokens(model, delimiter);
		result += delimiter;
		tokenCount += delimiterTokens;
		for (const rawItem of items) {
			const item = extractString(rawItem);
			const nextTokenCount = delimiterTokens + await countTokens(model, item);
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
	return template.extract(inputString);
};

const growInput = async (seed : Seed<SeedDataInput>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const question = extractString(await getProperty(seed, env, data.question));
	const def = leafValue.parse(await getProperty(seed, env, data.default || ''));
	const mock = seed.garden.environment.getKnownBooleanKey('mock');
	if (mock) {
		return def;
	}
	return await seed.garden.profile.prompt(question, def);
};

const growReference = async (seed : Seed<SeedDataReference>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const id = extractString(await getProperty(seed, env, data.seed_id, ''));
	const rawPacket = extractString(await getProperty(seed, env, data.packet, ''));
	const absReference = makeAbsolute({seed: id, packet: rawPacket}, seed.location);
	return packSeedReference(absReference);
};

const growDynamic = async (seed : Seed<SeedDataDynamic>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const ref = extractString(await getProperty(seed, env, data.reference, ''));
	if (!ref) throw new Error('empty reference');
	const unpackedRef = unpackSeedReference(ref);
	if (!isLocalLocation(unpackedRef.packet)) throw new Error(`Cannot load a dynamic remote seed packet: ${unpackedRef.packet}`);
	return await growSubSeed(seed,env,unpackedRef);
};

const growProperty = async (seed : Seed<SeedDataProperty>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const obj = await getProperty(seed, env, data.object);
	if (typeof obj !== 'object' || !obj) throw new Error('property requires object to be an object');
	const property = extractString(await getProperty(seed, env, data.property));
	//obj might be an object, an array, or even an embedding. Whatever!
	
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (obj as any)[property];
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

const growVar = async (seed : Seed<SeedDataVar>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const nameInput = extractString(await getProperty(seed, env, data.name));
	const name = env.getVarName(nameInput);
	//environment.get will properly refuse to get secretValues.
	return env.get(name);
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
	if (result === undefined) return null;
	return result;
};

const growDelete = async (seed : Seed<SeedDataDelete>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const rawStoreID = extractString(await getProperty(seed, env, data.store, env.getKnownStringKey('store')));
	const storeID = env.getStoreID(rawStoreID);
	const key = extractString(await getProperty(seed, env, data.name));
	return seed.garden.profile.delete(storeID, key);
};

export const grow = async (seed : Seed, env : Environment) : Promise<Value> => {
	const verbose = env.getKnownBooleanKey('verbose');
	const id = packSeedReference(seed.ref);
	if (verbose) {
		const json = JSON.stringify(seed.data, null, '\t');
		seed.garden.profile.log(`### Growing seed ${id}:\n\n${json}\n`);
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
	case 'var':
		result = await growVar(seed as Seed<SeedDataVar>, env);
		break;
	case 'let':
		result = await growLet(seed as Seed<SeedDataLet>, env);
		break;
	case 'let-multi':
		result = await growLetMulti(seed as Seed<SeedDataLetMulti>, env);
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
	default:
		return assertUnreachable(typ);
	}
	if (verbose) {
		const prettyResult = typeof result == 'object' ? JSON.stringify(result, null, '\t') : result;
		seed.garden.profile.log(`==> Returning value from ${id}:\n\n${prettyResult}\n`);
	}
	return result;
};