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
	RawEmbeddingVectorGecko1,
	embeddingModelID,
	rawEmbeddingVectorAda2,
	rawEmbeddingVectorGecko1
} from './types.js';

import {
	ADA_2_EMBEDDING_LENGTH,
	GECKO_1_EMBEDDING_LENGTH,
	assertUnreachable
} from './util.js';

import {
	Configuration,
	OpenAIApi
} from 'openai';

import {
	z
} from 'zod';

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

export class EmbeddingGecko1 extends Embedding<RawEmbeddingVectorGecko1> {
	override get model() : EmbeddingModelID {
		return 'google.com:embedding-gecko-001';
	}

	override _validator(input: RawEmbeddingVectorGecko1) {
		rawEmbeddingVectorGecko1.parse(input);
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
	},
	'google.com:embedding-gecko-001': {
		constructor: EmbeddingGecko1,
		maxTokens: 1024,
		embeddingLength: GECKO_1_EMBEDDING_LENGTH
	}
};

type CompletionInfo = {
	maxTokens: number;	
};

export const COMPLETIONS_BY_MODEL : {[name in CompletionModelID] : CompletionInfo } = {
	'openai.com:gpt-3.5-turbo': {
		maxTokens: 4096
	},
	'google.com:chat-bison-001': {
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
	case 'google.com':
		return computeEmbeddingGoogle(apiKey, modelName, text);
	default:
		return assertUnreachable(provider);
	}
};

const googleEmbedRequest = z.object({
	text: z.string()
});

type GoogleEmbedRequest = z.infer<typeof googleEmbedRequest>;

const googleEmbedResponse = z.object({
	embedding: z.object({
		value: z.array(z.number())
	})
});

const computeEmbeddingGoogle = async (apiKey : string, modelName: string, text : string) : Promise<EmbeddingGecko1> => {

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