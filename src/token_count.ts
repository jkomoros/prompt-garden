import {
	Environment
} from './environment.js';

import {
	CompletionModelID,
	EmbeddingModelID,
	GooglePromptRequest,
	ModelProvider,
	googleCountTokensResponse,
	modelProvider
} from './types.js';

import {
	assertUnreachable
} from './util.js';

export const extractModel = (model : EmbeddingModelID | CompletionModelID) : [name : ModelProvider, modelName : string] => {
	const parts = model.split(':');
	if (parts.length != 2) throw new Error('Model didn\'t have : as expected');
	return [modelProvider.parse(parts[0]), parts[1]];
};

const countTokensOpenAI = async (text : string) : Promise<number> => {
	//Note: the types are declared in src/gpt-tok.d.ts, which is set to not be visible in VSCode.
	const {default: module } = await import('gpt-tok');

	return module.encode(text).length;
};

const countTokensGoogle = async (env : Environment, modelName : string, text : string) : Promise<number> => {
	//TODO: verify if countTokens also, like embedding, fails for an empty string.
	if (!text) text = ' ';
	const key = env.getAPIKey('google.com');
	const url = `https://generativelanguage.googleapis.com/v1beta2/models/${modelName}:countMessageTokens?key=${key}`;
	const body : GooglePromptRequest = {
		prompt: {
			messages: [
				{
					content: text
				}
			]
		}
	};
	const result = await fetch(url, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	const json = await result.json();
	const parsedJSON = googleCountTokensResponse.parse(json);
	return parsedJSON.tokenCount;
};

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