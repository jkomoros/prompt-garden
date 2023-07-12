import {
	ADA_2_EMBEDDING_LENGTH,
	CompletionModelID,
	EmbeddingModelID,
	RawEmbeddingVector,
	RawEmbeddingVectorAda2,
	rawEmbeddingVectorAda2
} from './types.js';

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