import {
	EmbeddingModelID
} from './types.js';

export const countTokens = async (model : EmbeddingModelID, text : string) : Promise<number> => {
	if (model != 'openai.com:text-embedding-ada-002') throw new Error(`Unsupported embedding model: ${model}`);
	//TODO: an accurate token count for this model.
	return text.length / 4;
};