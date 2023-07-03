import {
	EmbeddingModelID
} from './types.js';

export const countTokens = async (model : EmbeddingModelID, text : string) : Promise<number> => {
	if (model != 'openai.com:text-embedding-ada-002') throw new Error(`Unsupported embedding model: ${model}`);

	//Note: the types are declared in src/gpt-tok.d.ts, which is set to not be visible in VSCode.
	const {default: module } = await import('gpt-tok');

	return module.encode(text).length;
};