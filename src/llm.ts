import {
	EmbeddingGecko1,
	GECKO_1_EMBEDDING_LENGTH,
	computeEmbeddingGoogle,
	computePromptGoogle,
	computeTokenCountGoogle
} from './providers/google.js';

import {
	ADA_2_EMBEDDING_LENGTH,
	EmbeddingAda2,
	computeEmbeddingOpenAI,
	computePromptOpenAI,
	computeTokenCountOpenAI
} from './providers/openai.js';

import {
	Embedding
} from './embedding.js';

import {
	CompletionModelID,
	EmbeddingModelID,
	KnownEnvironmentSecretKey,
	ModelProvider,
	modelProvider
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	assertUnreachable,
	mockedResult
} from './util.js';
import { Profile } from './profile.js';

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
	compute: (modelName : string, apiKey : string, prompt : string) => Promise<string>
};

export const COMPLETIONS_BY_MODEL : {[name in CompletionModelID] : CompletionInfo } = {
	'openai.com:gpt-3.5-turbo': {
		maxTokens: 4096,
		compute: computePromptOpenAI
	},
	'google.com:chat-bison-001': {
		maxTokens: 4096,
		compute: computePromptGoogle
	}
};

type ProviderInfo = {
	defaultEmbeddingModel: EmbeddingModelID,
	defaultCompletionModel: CompletionModelID,
	apiKeyVar: KnownEnvironmentSecretKey
}

export const INFO_BY_PROVIDER : {[name in ModelProvider]: ProviderInfo} = {
	'openai.com': {
		defaultCompletionModel: 'openai.com:gpt-3.5-turbo',
		defaultEmbeddingModel: 'openai.com:text-embedding-ada-002',
		apiKeyVar: 'openai_api_key'
	},
	'google.com': {
		defaultCompletionModel:'google.com:chat-bison-001',
		defaultEmbeddingModel:'google.com:embedding-gecko-001',
		apiKeyVar:'google_api_key'
	}
};

const RANDOM_EMBEDDING_TEXT = '~RANDOM~';

export const randomEmbedding = (env : Environment, model : EmbeddingModelID, text = RANDOM_EMBEDDING_TEXT) : Embedding => {
	const modelInfo = EMBEDDINGS_BY_MODEL[model];

	const fakeVector : number[] = [];
	for (let i = 0; i < modelInfo.embeddingLength; i ++) {
		fakeVector.push(env.random());
	}
	//TODO: should there be a mock:true or some other way of telling it was mocked?
	return new modelInfo.constructor(fakeVector, text);
};

export const computeEmbedding = async (text : string, env : Environment, profile : Profile) : Promise<Embedding> => {
	//Throw if the embedding model is not a valid value
	const model = env.getEmbeddingModel();

	const [provider, modelName] = extractModel(model);

	const apiKey = env.getAPIKey(provider);
	if (!apiKey) throw new Error ('Unset API key');

	const modelInfo = EMBEDDINGS_BY_MODEL[model];

	const mock = env.getKnownProtectedKey('mock');
	if (mock) {
		return randomEmbedding(env, model, text);
	}

	if (env.getKnownBooleanKey('verbose')) {
		profile.log(`Using model ${model}`);
	}

	return modelInfo.compute(apiKey, modelName, text);
};

export const computePrompt = async (prompt : string, env : Environment, profile : Profile) : Promise<string> => {
	//Throw if the completion model is not a valid value
	const model = env.getCompletionModel();

	const [provider, modelName] = extractModel(model);

	const apiKey = env.getAPIKey(provider);
	if (!apiKey) throw new Error ('Unset API key');

	const mock = env.getKnownProtectedKey('mock');
	if (mock) {
		return mockedResult(prompt);
	}

	if (env.getKnownBooleanKey('verbose')) {
		profile.log(`Using model ${model}`);
	}

	const modelInfo = COMPLETIONS_BY_MODEL[model];

	return modelInfo.compute(modelName, apiKey, prompt);
};

export const computeTokenCount = async (env : Environment, context: 'embedding' | 'completion', text : string, profile : Profile) : Promise<number> => {
	
	const model = context == 'embedding' ? env.getEmbeddingModel() : env.getCompletionModel();
	
	const [provider, modelName] = extractModel(model);

	if (env.getKnownBooleanKey('verbose')) {
		profile.log(`Using model ${model}`);
	}
	
	//Check to make sure it's a known model in a way that will warn when we add new models.
	switch(provider) {
	case 'openai.com':
		return computeTokenCountOpenAI(env, modelName, text);
	case 'google.com':
		return computeTokenCountGoogle(env, modelName, text);
	default:
		assertUnreachable(provider);
	}
	return -1;
};