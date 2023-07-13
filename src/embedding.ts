import {
	EmbeddingModelID,
	RawEmbeddingVector,
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