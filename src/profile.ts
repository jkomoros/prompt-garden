import {
	Embedding
} from './embedding.js';

import {
	Garden
} from './garden.js';

import {
	EmbeddingModelID,
	LeafValue,
	MemoryID,
	RawEmbeddingVector,
	SeedPacketAbsoluteRemoteLocation,
	StoreID,
	StoreKey,
	StoreValue,
	URLDomain
} from './types.js';

//When changing this also change environment.SAMPLE.json
export const DEFAULT_MEMORY_NAME = '_default_memory';

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

	_allowedFetches : {
		[packet : SeedPacketAbsoluteRemoteLocation]: {
			[resourceDomain : URLDomain] : true
		}
	};

	_memories : {
		[id : MemoryID]: {
			embeddings: Embedding[]
			model: EmbeddingModelID
		}
	};

	_stores : {
		[id : StoreID]: {
			[name : StoreKey]: StoreValue
		}
	};

	_cachedEmbeddings : {
		[model in EmbeddingModelID]?: {
			[text : string]: RawEmbeddingVector
		}
	};

	constructor() {
		this._memories = {};
		this._stores = {};
		this._allowedFetches = {};
		this._cachedEmbeddings = {};
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

	getCachedEmbeddingVector(model : EmbeddingModelID, text : string) : RawEmbeddingVector | undefined {
		const subMap = this._cachedEmbeddings[model];
		if (!subMap) return undefined;
		return subMap[text];
	}

	cacheEmbeddingVector(model : EmbeddingModelID, text : string, vector : RawEmbeddingVector) {
		if (!this._cachedEmbeddings[model]) this._cachedEmbeddings[model] = {};
		//Yes, typescript, this will be set...
		const subObj = this._cachedEmbeddings[model];
		if (!subObj) return;
		subObj[text] = vector;
	}

	//Whether to allow fetch of a given location.
	async allowFetch(remotePacketLocation : SeedPacketAbsoluteRemoteLocation, domain : URLDomain) : Promise<boolean> {
		if (this._allowedFetches[remotePacketLocation]) {
			if (this._allowedFetches[remotePacketLocation][domain]) return true;
		}
		const question = `Do you want to allow a seed in ${remotePacketLocation} to fetch from domain ${domain}?`;
		if (!confirm(question)) return false;
		if (!confirm(`Do you want to save the choice to allow ${remotePacketLocation} to fetch from domain ${domain}?`)) return true;
		if (!this._allowedFetches[remotePacketLocation]) this._allowedFetches[remotePacketLocation] = {};
		this._allowedFetches[remotePacketLocation][domain] = true;
		return true;
	}

	async localFetch(_location : string) : Promise<string> {
		throw new Error('localFetch is not supported on this profile type');
	}

	async prompt(question: string, defaultValue: LeafValue, choices? : string[]): Promise<string> {
		const def = String(defaultValue);
		if (!choices) return prompt(question, def) || '';

		const finalQuestion = question + '\n\nChoices:\n' + choices.join('\n');

		const answer = prompt(finalQuestion, def);

		if (!choices.some(choice => answer == choice)) throw new Error(`${answer} was not a valid choice`);

		return answer || '';

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

	store(store : StoreID, key : StoreKey, value : StoreValue) : void {
		if (!this._stores[store]) {
			this._stores[store] = {};
		}
		this._stores[store][key] = value;
	}

	retrieve(store : StoreID, key : StoreKey) : StoreValue | undefined {
		if (!this._stores[store]) return undefined;
		return this._stores[store][key];
	}

	delete(store : StoreID, key : StoreKey) : boolean {
		if (!this._stores[store]) return false;
		//TODO: return false if this._stores[store][key] is not set
		delete this._stores[store][key];
		return true;
	}

	enumerateStores() : StoreID[] {
		return Object.keys(this._stores);
	}

	enumerateMemories() : MemoryID[] {
		return Object.keys(this._memories);
	}

}