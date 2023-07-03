import {
	Embedding
} from './embedding.js';

import {
	Garden
} from './garden.js';

import {
	EmbeddingModelID,
	LeafValue,
	MemoryID
} from './types.js';

//When changing this also change environment.SAMPLE.json
export const DEFAULT_MEMORY_NAME = '_default';

//The following is a very simple, demo in-memory store of embeddings and memories.
//It's not efficient enough to use for large amounts of data.

const embeddingSimilarity = (a : Embedding, b: Embedding) : number => {
	const aVec = a.vector;
	const bVec = b.vector;
	if (aVec.length != bVec.length) throw new Error('Unequal length');

	let dotProduct = 0;
	let magnitudeA = 0;
	let magnitudeB = 0;

	for (let i = 0; i < aVec.length; i++) {
		dotProduct += aVec[i] * bVec[i];
		magnitudeA += aVec[i] * aVec[i];
		magnitudeB += bVec[i] * bVec[i];
	}

	magnitudeA = Math.sqrt(magnitudeA);
	magnitudeB = Math.sqrt(magnitudeB);

	if (magnitudeA === 0 || magnitudeB === 0) {
		throw new Error('One or both arrays have zero magnitude');
	}

	const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);
	return cosineSimilarity;
};

const closestItems = (memories : Embedding[], query : Embedding, k : number) : Embedding[] => {
	//memories and query have already been confirmed to be in the same embedding space.
	//TODO: Shouldn't ^ be confirmed with generics or something?

	const sortedItems = memories.map((memory, i) => ({similarity: embeddingSimilarity(memory, query), originalIndex: i})).sort((a, b) => a.similarity - b.similarity);
	const result : Embedding[] = [];
	for (let i = 0; i < k; i++) {
		if (sortedItems.length <= i) break;
		result.push(memories[sortedItems[i].originalIndex]);
	}
	return result;
};

export class Profile{

	_garden : Garden | undefined;

	_memories : {
		[id : MemoryID]: {
			embeddings: Embedding[]
			model: EmbeddingModelID
		}
	};

	constructor() {
		this._memories = {};
	}

	set garden(val : Garden) {
		this._garden = val;
	}

	get garden() : Garden | undefined {
		return this._garden;
	}

	verboseLog(message? : unknown, ...optionalParams: unknown[]): void {
		if (!this.garden?.environment.getKnownBooleanKey('verbose')) return;
		this.log(message, ...optionalParams);
	}

	log(message? : unknown, ...optionalParams: unknown[]) : void {
		console.log(message, ...optionalParams);
	}

	async localFetch(_location : string) : Promise<unknown> {
		throw new Error('localFetch is not supported on this profile type');
	}

	async prompt(question: string, defaultValue: LeafValue): Promise<string> {
		return prompt(question, String(defaultValue)) || '';
	}

	async memorize(embedding : Embedding, memory : MemoryID) : Promise<void> {
		if (!this._memories[memory]) {
			this._memories[memory] = {
				embeddings: [],
				model: embedding.model
			};
		}
		const mem = this._memories[memory];
		if (mem.model != embedding.model) throw new Error(`${memory} expects a model of type ${mem.model} but provided ${embedding.model}`);
		mem.embeddings.push(embedding);
	}

	async recall(query : Embedding, memory: MemoryID, k : number) : Promise<Embedding[]> {
		const mem = this._memories[memory];
		if (!mem) throw new Error(`Memory ${memory} did not exist`);
		if (mem.model != query.model) throw new Error(`${memory} expects a model of type ${mem.model} but query was of type ${query.model}`);
		return closestItems(mem.embeddings, query, k);
	}

}