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
	SeedDataTemplate,
	SeedDataInput,
	leafValue,
	SeedDataProperty,
	SeedDataObject,
	ValueObject,
	LeafValue,
	SeedDataVar
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

import pupa from 'pupa';

const growSubSeed = async (parent : Seed, ref : SeedReference) : Promise<Value> => {
	const absoluteRef = makeAbsolute(ref, parent.location);
	const seed = await parent.garden.seed(absoluteRef);
	return seed.grow();
};

const getProperty = async (parent : Seed, input : Value | SeedReference) : Promise<Value> => {
	if (seedReference.safeParse(input).success) {
		return await growSubSeed(parent, input as SeedReference);
	}
	return input;
};

const growPrompt = async (seed : Seed<SeedDataPrompt>) : Promise<Value> => {

	const env = seed.garden.environment;

	const data = seed.data;

	//Throw if the completion model is not a valid value
	const model = completionModelID.parse(env.getKnownKey('completion_model'));

	//TODO: have machinery to extract out the model name for the provider.
	//The modelName as far as openai is concerned is the second part of the identifier.
	const modelName = model.split(':')[1];

	const apiKey = env.getKnownSecretKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const prompt = String(await getProperty(seed, data.prompt));

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

const growLog = async (seed : Seed<SeedDataLog>) : Promise<Value> => {
	const data = seed.data;
	const value = await getProperty(seed, data.value);
	const env = seed.garden.environment;
	const mock = env.getKnownBooleanKey('mock');
	if (!mock) {
		console.log(value);
	}
	return value;
};

const growIf = async (seed : Seed<SeedDataIf>) : Promise<Value> => {
	const data = seed.data;
	const test = Boolean(await getProperty(seed, data.test));
	if (test) {
		return await getProperty(seed, data.then);
	}
	return await getProperty(seed, data.else);
};

const growEqual = async (seed : Seed<SeedDataEqual>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	const b = await getProperty(seed, data.b);
	return a == b;
};

const growNotEqual = async (seed : Seed<SeedDataNotEqual>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	const b = await getProperty(seed, data.b);
	return a != b;
};

const growLessThan = async (seed : Seed<SeedDataLessThan>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	const b = await getProperty(seed, data.b);
	return a < b;
};

const growGreaterThan = async (seed : Seed<SeedDataGreaterThan>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	const b = await getProperty(seed, data.b);
	return a > b;
};

const growLessThanOrEqualTo = async (seed : Seed<SeedDataLessThanOrEqualTo>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	const b = await getProperty(seed, data.b);
	return a <= b;
};

const growGreaterThanOrEqualTo = async (seed : Seed<SeedDataGreaterThanOrEqualTo>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	const b = await getProperty(seed, data.b);
	return a >= b;
};

const growNot = async (seed : Seed<SeedDataNot>) : Promise<boolean> => {
	const data = seed.data;
	const a = await getProperty(seed, data.a);
	return !a;
};

const growTemplate = async (seed : Seed<SeedDataTemplate>) : Promise<string> => {
	const data = seed.data;
	const template = String(await getProperty(seed, data.template));
	const vars = await getProperty(seed, data.vars);
	if (typeof vars != 'object') throw new Error('vars should be an object mapping properties to values');
	return pupa(template, vars as Record<string, string>);
};

const growInput = async (seed : Seed<SeedDataInput>) : Promise<Value> => {
	const data = seed.data;
	const question = String(await getProperty(seed, data.question));
	const def = leafValue.parse(await getProperty(seed, data.default || ''));
	const mock = seed.garden.environment.getKnownBooleanKey('mock');
	if (mock) {
		return def;
	}
	return await seed.garden.prompt(question, def);
};

const growProperty = async (seed : Seed<SeedDataProperty>) : Promise<Value> => {
	const data = seed.data;
	const obj = await getProperty(seed, data.object);
	if (typeof obj !== 'object' || !obj) throw new Error('property requires object to be an object');
	const property = String(await getProperty(seed, data.property));
	return obj[property];
};

const growObject = async (seed : Seed<SeedDataObject>) : Promise<Value> => {
	const data = seed.data;
	const result : ValueObject = {};
	for (const [key, value] of Object.entries(data.properties)) {
		//Cheat and pretned the return value is a LeafValue event hough it might not be 
		result[key] = await getProperty(seed, value) as LeafValue;
	}
	return result;
};

const growVar = async (seed : Seed<SeedDataVar>) : Promise<Value> => {
	const data = seed.data;
	const name = String(await getProperty(seed, data.name));
	//environment.get will properly refuse to get secretValues.
	return seed.garden.environment.get(name);
};

export const grow = async (seed : Seed) : Promise<Value> => {
	const env = seed.garden.environment;
	const verbose = env.getKnownBooleanKey('verbose');
	const id = packSeedReference(seed.ref);
	if (verbose) {
		const json = JSON.stringify(seed.data, null, '\t');
		console.log(`Growing seed ${id}:\n${json}`);
	}
	const data = seed.data;
	const typ = data.type;
	let result : Value = false;
	switch (typ) {
	case 'prompt':
		result = await growPrompt(seed as Seed<SeedDataPrompt>);
		break;
	case 'log':
		result = await growLog(seed as Seed<SeedDataLog>);
		break;
	case 'if':
		result = await growIf(seed as Seed<SeedDataIf>);
		break;
	case '==':
		result = await growEqual(seed as Seed<SeedDataEqual>);
		break;
	case '!=':
		result = await growNotEqual(seed as Seed<SeedDataNotEqual>);
		break;
	case '<':
		result = await growLessThan(seed as Seed<SeedDataLessThan>);
		break;
	case '>':
		result = await growGreaterThan(seed as Seed<SeedDataGreaterThan>);
		break;
	case '<=':
		result = await growLessThanOrEqualTo(seed as Seed<SeedDataLessThanOrEqualTo>);
		break;
	case '>=':
		result = await growGreaterThanOrEqualTo(seed as Seed<SeedDataGreaterThanOrEqualTo>);
		break;
	case '!':
		result = await growNot(seed as Seed<SeedDataNot>);
		break;
	case 'template':
		result = await growTemplate(seed as Seed<SeedDataTemplate>);
		break;
	case 'input':
		result = await growInput(seed as Seed<SeedDataInput>);
		break;
	case 'property':
		result = await growProperty(seed as Seed<SeedDataProperty>);
		break;
	case 'object':
		result = await growObject(seed as Seed<SeedDataObject>);
		break;
	case 'var':
		result = await growVar(seed as Seed<SeedDataVar>);
		break;
	default:
		return assertUnreachable(typ);
	}
	if (verbose) {
		console.log(`Returning value from ${id}: ${result}`);
	}
	return result;
};