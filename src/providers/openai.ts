import {
	Configuration,
	OpenAIApi
} from 'openai';

import {
	z
} from 'zod';

import {
	EmbeddingModelID
} from '../types.js';

import {
	Embedding
} from '../embedding.js';

import {
	Environment
} from '../environment.js';

export const ADA_2_EMBEDDING_LENGTH = 1536;

//We basically redefine the rawEmbeddingVector to avoid a use-before-initalization
export const rawEmbeddingVectorAda2 = z.number().array().length(ADA_2_EMBEDDING_LENGTH);

export type RawEmbeddingVectorAda2 = z.infer<typeof rawEmbeddingVectorAda2>;

export class EmbeddingAda2 extends Embedding<RawEmbeddingVectorAda2> {
	override get model() : EmbeddingModelID {
		return 'openai.com:text-embedding-ada-002';
	}

	override _validator(input: RawEmbeddingVectorAda2) {
		rawEmbeddingVectorAda2.parse(input);
	}
}

export const computeEmbeddingOpenAI = async (apiKey : string, modelName: string, text : string) : Promise<EmbeddingAda2> => {
	const configuration = new Configuration({
		apiKey
	});

	const openai = new OpenAIApi(configuration);

	const result = await openai.createEmbedding({
		model: modelName,
		input: text
		//TODO: allow passing other parameters
	});

	const vector = result.data.data[0].embedding;

	return new EmbeddingAda2(vector, text);
};

export const computePromptOpenAI = async (modelName : string, apiKey : string, prompt : string) : Promise<string> => {
	const configuration = new Configuration({
		apiKey
	});

	const openai = new OpenAIApi(configuration);

	const result = await openai.createChatCompletion({
		model: modelName,
		messages: [
			{
				role: 'user',
				content: prompt
			}
		]
		//TODO: allow passing other parameters
	});

	return result.data.choices[0].message?.content || '';
};

export const computeTokenCountOpenAI = async (_env : Environment, _modelName : string,  text : string) : Promise<number> => {
	//Note: the types are declared in src/gpt-tok.d.ts, which is set to not be visible in VSCode.
	const {default: module } = await import('gpt-tok');

	return module.encode(text).length;
};