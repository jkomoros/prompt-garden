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
	completionModelID,
	embeddingModelID
} from './types.js';

import {
	assertUnreachable
} from './util.js';

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