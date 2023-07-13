import {
	z
} from 'zod';

import {
	EmbeddingModelID,
} from '../types.js';

import {
	Embedding
} from '../embedding.js';

import {
	Environment
} from '../environment.js';

export const GECKO_1_EMBEDDING_LENGTH = 768;

//We basically redefine the rawEmbeddingVector to avoid a use-before-initalization
export const rawEmbeddingVectorGecko1= z.number().array().length(GECKO_1_EMBEDDING_LENGTH);

export type RawEmbeddingVectorGecko1 = z.infer<typeof rawEmbeddingVectorGecko1>;

export class EmbeddingGecko1 extends Embedding<RawEmbeddingVectorGecko1> {
	override get model() : EmbeddingModelID {
		return 'google.com:embedding-gecko-001';
	}

	override _validator(input: RawEmbeddingVectorGecko1) {
		rawEmbeddingVectorGecko1.parse(input);
	}
}

const googleEmbedRequest = z.object({
	text: z.string()
});

type GoogleEmbedRequest = z.infer<typeof googleEmbedRequest>;

const googleEmbedResponse = z.object({
	embedding: z.object({
		value: z.array(z.number())
	})
});

const googlePromptRequest = z.object({
	prompt: z.object({
		messages: z.array(z.object({
			content: z.string()
		}))
	})
});

type GooglePromptRequest = z.infer<typeof googlePromptRequest>;

const googleCountTokensResponse = z.object({
	tokenCount: z.number()
});

const googlePromptResponse = z.object({
	candidates: z.array(z.object({
		content: z.string()
	}))
});

export const computeEmbeddingGoogle = async (apiKey : string, modelName: string, text : string) : Promise<EmbeddingGecko1> => {

	//The backend will fail if the text is ''.
	if (!text) text = ' ';

	const url = `https://generativelanguage.googleapis.com/v1beta2/models/${modelName}:embedText?key=${apiKey}`;
	const body : GoogleEmbedRequest = {
		text
	};
	const result = await fetch(url, {
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	const json = await result.json();
	const parsedJSON = googleEmbedResponse.parse(json);
	const vector = parsedJSON.embedding.value;
	return new EmbeddingGecko1(vector, text);
};

export const computePromptGoogle = async (modelName : string, apiKey : string, prompt : string) : Promise<string> => {
	const url = `https://generativelanguage.googleapis.com/v1beta2/models/${modelName}:generateMessage?key=${apiKey}`;
	const body : GooglePromptRequest = {
		prompt: {
			messages: [
				{
					content: prompt
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
	const parsedJSON = googlePromptResponse.parse(json);
	return parsedJSON.candidates[0].content;
};

export const computeTokenCountGoogle = async (env : Environment, modelName : string, text : string) : Promise<number> => {
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