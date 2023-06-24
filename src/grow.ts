import {
	SeedDataLog,
	SeedDataIf,
	SeedDataPrompt,
	Value,
	completionModelID,
	SeedReference
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
	makeAbsolute, seedReferenceToString
} from './reference.js';

import {
	Seed
} from './seed.js';

const growSubSeed = async (parent : Seed, ref : SeedReference) : Promise<Value> => {
	const absoluteRef = makeAbsolute(ref, parent.location);
	const seed = parent.garden.seed(absoluteRef);
	return seed.grow();
};

const growPrompt = async (seed : Seed<SeedDataPrompt>) : Promise<Value> => {

	const env = seed.garden.environment;

	const data = seed.data;

	//Throw if the completion model is not a valid value
	const model = completionModelID.parse(env.getKnownKey('completion_model'));

	//TODO: have machinery to extract out the model name for the provider.
	//The modelName as far as openai is concerned is the second part of the identifier.
	const modelName = model.split(':')[1];

	const apiKey = env.getKnownStringKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const prompt = typeof data.prompt == 'string' ? data.prompt : String(await growSubSeed(seed, data.prompt));

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
	const value = typeof data.value != 'object' ? data.value : String(await growSubSeed(seed, data.value));
	const env = seed.garden.environment;
	const mock = env.getKnownBooleanKey('mock');
	if (!mock) {
		console.log(value);
	}
	return value;
};

const growIf = async (seed : Seed<SeedDataIf>) : Promise<Value> => {
	const data = seed.data;
	const test = Boolean(typeof data.test != 'object' ? data.test : await growSubSeed(seed, data.test));
	if (test) {
		return typeof data.then != 'object' ? data.then : await growSubSeed(seed, data.then);
	}
	return typeof data.else != 'object' ? data.else : await growSubSeed(seed, data.else);
};

export const grow = async (seed : Seed) : Promise<Value> => {
	const env = seed.garden.environment;
	const verbose = env.getKnownBooleanKey('verbose');
	const id = seedReferenceToString(seed.ref);
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
	default:
		return assertUnreachable(typ);
	}
	if (verbose) {
		console.log(`Returning value from ${id}: ${result}`);
	}
	return result;
};