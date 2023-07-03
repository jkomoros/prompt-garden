import {
	EmbeddingModelID,
	RawEmbeddingVector,
	RawEmbeddingVectorAda2,
	rawEmbeddingVectorAda2
} from './types.js';

export abstract class Embedding<V extends RawEmbeddingVector = RawEmbeddingVector>{

	_vector : V;
	_text : string | undefined;

	constructor(vector : V, text? : string) {
		this._vector = vector;
		this._text = text;
	}

	abstract get model() : EmbeddingModelID

	//Should throw an error if the given input doesn't match the expected type
	abstract _validator(input : V) : void

	get vector() : V {
		return this._vector;
	}

	get text() : string | undefined {
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

export const EMBEDDINGS_BY_MODEL : {[name in EmbeddingModelID] : {constructor: new (vector : number[], text?: string) => Embedding}} = {
	'openai.com:text-embedding-ada-002': {
		constructor: EmbeddingAda2
	}
};