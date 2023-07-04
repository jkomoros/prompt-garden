import {
	CompletionModelID,
	EmbeddingModelID,
	ModelProvider,
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

export const countTokens = async (model : EmbeddingModelID | CompletionModelID, text : string) : Promise<number> => {
	const [provider] = extractModel(model);
	
	//Check to make sure it's a known model in a way that will warn when we add new models.
	switch(provider) {
	case 'openai.com':
		//OK
		break;
	default:
		assertUnreachable(provider);
	}

	//Note: the types are declared in src/gpt-tok.d.ts, which is set to not be visible in VSCode.
	const {default: module } = await import('gpt-tok');

	return module.encode(text).length;
};