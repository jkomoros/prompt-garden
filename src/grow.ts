import {
	LocalSeedID,
	SeedData,
	SeedDataLog,
	SeedDataPrompt,
	SeedReference,
	Value,
	completionModelID
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
	Garden
} from './garden.js';

const growSubSeed = async (ref : SeedReference, garden : Garden) : Promise<Value> => {
	const seed = garden.seed(ref.ref);
	return seed.grow();
};

const growPrompt = async (data : SeedDataPrompt, garden : Garden) : Promise<Value> => {

	const env = garden.environment;

	//Throw if the completion model is not a valid value
	const model = completionModelID.parse(env.getKnownKey('completion_model'));

	//TODO: have machinery to extract out the model name for the provider.
	//The modelName as far as openai is concerned is the second part of the identifier.
	const modelName = model.split(':')[1];

	const apiKey = env.getKnownStringKey('openai_api_key');
	if (!apiKey) throw new Error ('Unset openai_api_key');

	const prompt = typeof data.prompt == 'string' ? data.prompt : String(await growSubSeed(data.prompt, garden));

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

const growLog = async (data : SeedDataLog, garden : Garden) : Promise<Value> => {
	const value = typeof data.value != 'object' ? data.value : String(await growSubSeed(data.value, garden));
	const env = garden.environment;
	const mock = env.getKnownBooleanKey('mock');
	if (!mock) {
		console.log(value);
	}
	return value;
};

export const grow = async (id : LocalSeedID, data : SeedData, garden : Garden) : Promise<Value> => {
	const env = garden.environment;
	const verbose = env.getKnownBooleanKey('verbose');
	if (verbose) {
		const json = JSON.stringify(data, null, '\t');
		console.log(`Growing seed ${id}:\n${json}`);
	}
	const typ = data.type;
	let result : Value = false;
	switch (typ) {
	case 'prompt':
		result = await growPrompt(data, garden);
		break;
	case 'log':
		result = await growLog(data, garden);
		break;
	default:
		return assertUnreachable(typ);
	}
	if (verbose) {
		console.log(`Returning value from ${id}: ${result}`);
	}
	return result;
};