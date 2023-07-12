import {
	Environment
} from './environment.js';

import {
	extractModel
} from './token_count.js';

import {
	CompletionModelID,
	EmbeddingModelID,
	RawEmbeddingVector,
	RawEmbeddingVectorAda2,
	embeddingModelID,
	rawEmbeddingVectorAda2
} from './types.js';

import {
	ADA_2_EMBEDDING_LENGTH,
	assertUnreachable
} from './util.js';

import {
	Configuration,
	OpenAIApi
} from 'openai';

export abstract class Embedding<V extends RawEmbeddingVector = RawEmbeddingVector>{

	_vector : V;
	_text : string ;

	constructor(vector : V, text : string) {
		this._vector = vector;
		this._text = text;
	}

	abstract get model() : EmbeddingModelID

	//Should throw an error if the given input doesn't match the expected type
	abstract _validator(input : V) : void

	get vector() : V {
		return this._vector;
	}

	get text() : string {
		return this._text;
	}

	toString() : string {
		return `@Embedding : ${this.model} : ${this.text}`;
	}

	toJSON() : string {
		return this.toString();
	}
}

export class EmbeddingAda2 extends Embedding<RawEmbeddingVectorAda2> {
	override get model() : EmbeddingModelID {
		return 'openai.com:text-embedding-ada-002';
	}

	override _validator(input: RawEmbeddingVectorAda2) {
		rawEmbeddingVectorAda2.parse(input);
	}
}

type EmbeddingInfo = {
	constructor: new (vector : number[], text: string) => Embedding,
	maxTokens: number,
	embeddingLength: number
};

export const EMBEDDINGS_BY_MODEL : {[name in EmbeddingModelID] : EmbeddingInfo }= {
	'openai.com:text-embedding-ada-002': {
		constructor: EmbeddingAda2,
		maxTokens: 8192,
		embeddingLength: ADA_2_EMBEDDING_LENGTH
	}
};

type CompletionInfo = {
	maxTokens: number;	
};

export const COMPLETIONS_BY_MODEL : {[name in CompletionModelID] : CompletionInfo } = {
	'openai.com:gpt-3.5-turbo': {
		maxTokens: 4096
	}
};

export const computeEmbedding = async (text : string, env : Environment) : Promise<Embedding> => {
	//Throw if the embedding model is not a valid value
	const model = embeddingModelID.parse(env.getKnownKey('embedding_model'));

	const [provider, modelName] = extractModel(model);

	const apiKey = env.getAPIKey(provider);
	if (!apiKey) throw new Error ('Unset API key');

	const modelInfo = EMBEDDINGS_BY_MODEL[model];

	const mock = env.getKnownProtectedKey('mock');
	if (mock) {
		const fakeVector : number[] = [];
		for (let i = 0; i < modelInfo.embeddingLength; i ++) {
			fakeVector.push(Math.random());
		}
		//TODO: should there be a mock:true or some other way of telling it was mocked?
		return new modelInfo.constructor(fakeVector, text);
	}

	switch(provider) {
	case 'openai.com':
		return computeEmbeddingOpenAI(apiKey, modelName, text);
	default:
		return assertUnreachable(provider);
	}
};

const computeEmbeddingOpenAI = async (apiKey : string, modelName: string, text : string) : Promise<EmbeddingAda2> => {
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