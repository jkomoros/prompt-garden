import {
	CompletionModelID,
	EmbeddingModelID,
	ModelProvider,
	modelProvider
} from './types.js';

export const extractModel = (model : EmbeddingModelID | CompletionModelID) : [name : ModelProvider, modelName : string] => {
	const parts = model.split(':');
	if (parts.length != 2) throw new Error('Model didn\'t have : as expected');
	return [modelProvider.parse(parts[0]), parts[1]];
};

export const countTokens = async (model : EmbeddingModelID, text : string) : Promise<number> => {
	if (model != 'openai.com:text-embedding-ada-002') throw new Error(`Unsupported embedding model: ${model}`);

	//Note: the types are declared in src/gpt-tok.d.ts, which is set to not be visible in VSCode.
	const {default: module } = await import('gpt-tok');

	return module.encode(text).length;
};