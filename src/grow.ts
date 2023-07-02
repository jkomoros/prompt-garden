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
	knownEnvironmentSecretKey
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
	makeAbsolute,
	packSeedReference
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
import { Embedding, EmbeddingAda2 } from './embedding.js';

const growSubSeed = async (parent : Seed, env : Environment, ref : SeedReference) : Promise<Value> => {
	const absoluteRef = makeAbsolute(ref, parent.location);
	const seed = await parent.garden.seed(absoluteRef);
	return seed.grow(env);
};

const getProperty = async (parent : Seed, env : Environment, input : Value | SeedReference) : Promise<Value> => {
	if (seedReference.safeParse(input).success) {
		return await growSubSeed(parent, env, input as SeedReference);
	}
	return input;
};

const growPrompt = async (seed : Seed<SeedDataPrompt>, env : Environment) : Promise<Value> => {

	const data = seed.data;

	//Throw if the completion model is not a valid value
	const model = completionModelID.parse(env.getKnownKey('completion_model'));

	//TODO: have machinery to extract out the model name for the provider.
	//The modelName as far as openai is concerned is the second part of the identifier.
	const modelName = model.split(':')[1];

	const apiKey = env.getKnownSecretKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const prompt = String(await getProperty(seed, env, data.prompt));

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

const growEmbed = async (seed : Seed<SeedDataEmbed>, env : Environment) : Promise<Embedding> => {

	const data = seed.data;

	//Throw if the embedding model is not a valid value
	const model = embeddingModelID.parse(env.getKnownKey('embedding_model'));

	//TODO: have machinery to extract out the model name for the provider.
	//The modelName as far as openai is concerned is the second part of the identifier.
	const modelName = model.split(':')[1];

	const apiKey = env.getKnownSecretKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const text = String(await getProperty(seed, env, data.text));

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

const growLog = async (seed : Seed<SeedDataLog>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const value = await getProperty(seed, env, data.value);
	const mock = env.getKnownBooleanKey('mock');
	if (!mock) {
		console.log(value);
	}
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
	return a < b;
};

const growGreaterThan = async (seed : Seed<SeedDataGreaterThan>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	return a > b;
};

const growLessThanOrEqualTo = async (seed : Seed<SeedDataLessThanOrEqualTo>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	return a <= b;
};

const growGreaterThanOrEqualTo = async (seed : Seed<SeedDataGreaterThanOrEqualTo>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	const b = await getProperty(seed, env, data.b);
	return a >= b;
};

const growNot = async (seed : Seed<SeedDataNot>, env : Environment) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, env, data.a);
	return !a;
};

const growRender = async (seed : Seed<SeedDataRender>, env : Environment) : Promise<string> => {
	const data = seed.data;
	const templateString = String(await getProperty(seed, env, data.template));
	const vars = await getProperty(seed, env, data.vars);
	if (typeof vars != 'object') throw new Error('vars should be an object mapping properties to values');
	const template = new Template(templateString);
	return template.render(vars as Record<string, string>);
};

const growExtract = async (seed : Seed<SeedDataExtract>, env : Environment) : Promise<ValueObject> => {
	const data = seed.data;
	const templateString = String(await getProperty(seed, env, data.template));
	const template = new Template(templateString);
	const inputString = String(await getProperty(seed, env, data.input));
	return template.extract(inputString);
};

const growInput = async (seed : Seed<SeedDataInput>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const question = String(await getProperty(seed, env, data.question));
	const def = leafValue.parse(await getProperty(seed, env, data.default || ''));
	const mock = seed.garden.environment.getKnownBooleanKey('mock');
	if (mock) {
		return def;
	}
	return await seed.garden.prompt(question, def);
};

const growProperty = async (seed : Seed<SeedDataProperty>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const obj = await getProperty(seed, env, data.object);
	if (typeof obj !== 'object' || !obj) throw new Error('property requires object to be an object');
	if (obj instanceof Embedding) throw new Error('property requires object to be an object');
	const property = String(await getProperty(seed, env, data.property));
	return obj[property];
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

const growVar = async (seed : Seed<SeedDataVar>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const name = String(await getProperty(seed, env, data.name));
	//environment.get will properly refuse to get secretValues.
	return env.get(name);
};

const growLet = async (seed : Seed<SeedDataLet>, env : Environment) : Promise<Value> => {
	const data = seed.data;
	const name = String(await getProperty(seed, env, data.name));
	if (knownEnvironmentSecretKey.safeParse(name).success) throw new Error(`let may not set secret keys: ${name}`);
	const value = await getProperty(seed, env, data.value);
	const newEnv = env.clone({[name]: value});
	return await getProperty(seed, newEnv, data.block);
};

export const grow = async (seed : Seed, env : Environment) : Promise<Value> => {
	const verbose = env.getKnownBooleanKey('verbose');
	const id = packSeedReference(seed.ref);
	if (verbose) {
		const json = JSON.stringify(seed.data, null, '\t');
		console.log(`### Growing seed ${id}:\n\n${json}\n`);
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
	case 'log':
		result = await growLog(seed as Seed<SeedDataLog>, env);
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
	case 'render':
		result = await growRender(seed as Seed<SeedDataRender>, env);
		break;
	case 'extract':
		result = await growExtract(seed as Seed<SeedDataExtract>, env);
		break;
	case 'input':
		result = await growInput(seed as Seed<SeedDataInput>, env);
		break;
	case 'property':
		result = await growProperty(seed as Seed<SeedDataProperty>, env);
		break;
	case 'object':
		result = await growObject(seed as Seed<SeedDataObject>, env);
		break;
	case 'var':
		result = await growVar(seed as Seed<SeedDataVar>, env);
		break;
	case 'let':
		result = await growLet(seed as Seed<SeedDataLet>, env);
		break;
	default:
		return assertUnreachable(typ);
	}
	if (verbose) {
		const prettyResult = typeof result == 'object' ? JSON.stringify(result, null, '\t') : result;
		console.log(`==> Returning value from ${id}:\n\n${prettyResult}\n`);
	}
	return result;
};