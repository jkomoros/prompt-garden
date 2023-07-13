import {
	Environment
} from './environment.js';

import {
	countTokensGoogle
} from './providers/google.js';

import {
	countTokensOpenAI
} from './providers/openai.js';

import {
	extractModel
} from './llm.js';

import {
	CompletionModelID,
	EmbeddingModelID
} from './types.js';

import {
	assertUnreachable
} from './util.js';

export const countTokens = async (env : Environment, model : EmbeddingModelID | CompletionModelID, text : string) : Promise<number> => {
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