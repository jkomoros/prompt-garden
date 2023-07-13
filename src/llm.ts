import {
	EmbeddingGecko1,
	GECKO_1_EMBEDDING_LENGTH,
	computeEmbeddingGoogle,
	computePromptGoogle,
	countTokensGoogle
} from './providers/google.js';

import {
	ADA_2_EMBEDDING_LENGTH,
	EmbeddingAda2,
	computeEmbeddingOpenAI,
	computePromptOpenAI,
	countTokensOpenAI
} from './providers/openai.js';

import {
	Embedding
} from './embedding.js';

import {
	CompletionModelID,
	EmbeddingModelID,
	ModelProvider,
	completionModelID,
	embeddingModelID,
	modelProvider
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	assertUnreachable,
	mockedResult
} from './util.js';

export const extractModel = (model : EmbeddingModelID | CompletionModelID) : [name : ModelProvider, modelName : string] => {
	const parts = model.split(':');
	if (parts.length != 2) throw new Error('Model didn\'t have : as expected');
	return [modelProvider.parse(parts[0]), parts[1]];
};

export type EmbeddingInfo = {
	constructor: new (vector : number[], text: string) => Embedding,
	maxTokens: number,
	embeddingLength: number,
	compute: (apiKey : string, modelName: string, text : string) => Promise<Embedding>
};

export const EMBEDDINGS_BY_MODEL : {[name in EmbeddingModelID] : EmbeddingInfo }= {
	'openai.com:text-embedding-ada-002': {
		constructor: EmbeddingAda2,
		maxTokens: 8192,
		embeddingLength: ADA_2_EMBEDDING_LENGTH,
		compute: computeEmbeddingOpenAI,
	},
	'google.com:embedding-gecko-001': {
		constructor: EmbeddingGecko1,
		maxTokens: 1024,
		embeddingLength: GECKO_1_EMBEDDING_LENGTH,
		compute: computeEmbeddingGoogle
	}
};

type CompletionInfo = {
	maxTokens: number;	
};

export const COMPLETIONS_BY_MODEL : {[name in CompletionModelID] : CompletionInfo } = {
	'openai.com:gpt-3.5-turbo': {
		maxTokens: 4096
	},
	'google.com:chat-bison-001': {
		maxTokens: 4096
	}
};

export const computeEmbedding = async (text : string, env : Environment) : Promise<Embedding> => {
	//Throw if the embedding model is not a valid value
	const model = embeddingModelID.parse(env.getKnownKey('embedding_model'));

	const [provider, modelName] = extractModel(model);

	const apiKey = env.getAPIKey(provider);
	if (!apiKey) throw new Error ('Unset API key');

	const modelInfo = EMBEDDINGS_BY_MODEL[model];

	const mock = env.getKnownProtectedKey('mock');
	if (mock) {
		const fakeVector : number[] = [];
		for (let i = 0; i < modelInfo.embeddingLength; i ++) {
			fakeVector.push(Math.random());
		}
		//TODO: should there be a mock:true or some other way of telling it was mocked?
		return new modelInfo.constructor(fakeVector, text);
	}

	return modelInfo.compute(apiKey, modelName, text);
};

export const computePrompt = async (prompt : string, env : Environment) : Promise<string> => {
	//Throw if the completion model is not a valid value
	const model = completionModelID.parse(env.getKnownKey('completion_model'));

	const [provider, modelName] = extractModel(model);

	const apiKey = env.getAPIKey(provider);
	if (!apiKey) throw new Error ('Unset API key');

	const mock = env.getKnownProtectedKey('mock');
	if (mock) {
		return mockedResult(prompt);
	}

	//Check to make sure it's a known model in a way that will warn when we add new models.
	switch(provider) {
	case 'openai.com':
		return computePromptOpenAI(modelName, apiKey, prompt);
	case 'google.com':
		return computePromptGoogle(modelName, apiKey, prompt);
	default:
		return assertUnreachable(provider);
	}
};

export const countTokens = async (env : Environment, context: 'embedding' | 'completion', text : string) : Promise<number> => {
	
	const model = context == 'embedding' ? embeddingModelID.parse(env.getKnownStringKey('embedding_model')) : completionModelID.parse(env.getKnownStringKey('completion_model'));
	
	const [provider, modelName] = extractModel(model);
	
	//Check to make sure it's a known model in a way that will warn when we add new models.
	switch(provider) {
	case 'openai.com':
		return countTokensOpenAI(text);
	case 'google.com':
		return countTokensGoogle(env, modelName, text);
	default:
		assertUnreachable(provider);
	}
	return -1;
};