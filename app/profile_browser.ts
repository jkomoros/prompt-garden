import {
	Profile,
	closestItems
} from '../src/profile.js';

import {
	z
} from 'zod';

import {
	MemoryID,
	SeedPacketAbsoluteLocalLocation,
	StoreID,
	StoreKey,
	StoreValue,
	embeddingModelID,
	rawEmbeddingVector,
	storeKey,
	storeValue
} from '../src/types.js';

import {
	Embedding
} from '../src/embedding.js';

import {
	EMBEDDINGS_BY_MODEL
} from '../src/llm.js';

const STORE_KEY_PREFIX = 'store_';
const MEMORY_KEY_PREFIX = 'memory_';

const localStorageKeys = () : string[] => {
	//localStorage has an Old Skool way of enumerating all keys
	const result : string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key === null) continue;
		result.push(key);
	}
	return result;
};

const storeApp = z.object({
	//This will help find storage format problems later
	version: z.literal(0),
	data: z.record(storeKey, storeValue)
});

type StoreBrowser = z.infer<typeof storeApp>;

const rawMemory = z.object({
	vector: rawEmbeddingVector,
	text: z.string()
});

const rawAssociativeMemory = z.object({
	//This will help find storage format problems later
	version: z.literal(0),
	model: embeddingModelID,
	items: z.array(rawMemory)
});

type RawAssociativeMemory = z.infer<typeof rawAssociativeMemory>;

const associativeMemory = rawAssociativeMemory.extend({
	items: z.array(z.instanceof(Embedding))
});

type AssociativeMemory = z.infer<typeof associativeMemory>;

//This profile knows how to load local packets from state.
export class ProfileBrowser extends Profile {

	_packets : Record<string,string>;

	//Profile has base _stores and _memories of different types
	_associativeMemories : {[name : MemoryID]: AssociativeMemory};
	_storeApps : {[name : StoreID] : StoreBrowser};

	constructor(stringifiedPackets : Record<string, string>) {
		super();
		this._packets = stringifiedPackets;
		//We lazy load this since the garden might be loaded and torn down
		//multiple times in quick succession, so loading and parsing each store
		//at boot would be prohibitively expensive for large profiles.
		this._storeApps = {};
		this._associativeMemories = {};
	}

	_loadStore(store : StoreID) : [s : StoreBrowser, created : boolean] {
		let created = false;
		if (!this._storeApps[store]) {
			//Try loading from localStorage.
			const key = STORE_KEY_PREFIX + store;
			const rawValue = localStorage.getItem(key);
			if (rawValue === null) {
				//This is the first get.
				this._storeApps[store] = {
					version: 0,
					data: {}
				};
				created = true;
			} else {
				const json = JSON.parse(rawValue);
				const rec = storeApp.parse(json);
				this._storeApps[store] = rec;
			}
		}
		return [this._storeApps[store], created];
	}

	_saveStore(store : StoreID) : void {
		const rec = this._storeApps[store];
		if (!rec) throw new Error(`${store} was unexpectedly empty`);
		const key = STORE_KEY_PREFIX + store;
		const json = JSON.stringify(rec, null, '\t');
		localStorage.setItem(key, json);
	}

	_loadMemory(memory : MemoryID, exampleEmbedding : Embedding) : AssociativeMemory {
		if (!this._associativeMemories[memory]) {
			//Try loading from localStorage.
			const key = MEMORY_KEY_PREFIX + memory;
			const rawValue = localStorage.getItem(key);
			if (rawValue === null) {
				//This is the first get.
				this._associativeMemories[memory] = {
					version: 0,
					model: exampleEmbedding.model,
					items: [],
				};
			} else {
				const json = JSON.parse(rawValue);
				const rawMem = rawAssociativeMemory.parse(json);
				if (rawMem.model != exampleEmbedding.model) throw new Error(`Mismatched embedding model: ${exampleEmbedding.model} is not ${rawMem.model}`);
				const mem : AssociativeMemory = {
					...rawMem,
					items: rawMem.items.map(item => new EMBEDDINGS_BY_MODEL[rawMem.model].constructor(item.vector, item.text)),
				};
				this._associativeMemories[memory] = mem;
			}
		}
		return this._associativeMemories[memory];
	}

	_saveMemory(memory : MemoryID) : void {
		const mem = this._associativeMemories[memory];
		if (!mem) throw new Error(`${memory} was unexpectedly empty`);
		const key = MEMORY_KEY_PREFIX + memory;
		const rawMem : RawAssociativeMemory = {
			...mem,
			items: mem.items.map(embedding => ({vector: embedding.vector, text: embedding.text}))
		};
		const json = JSON.stringify(rawMem, null, '\t');
		localStorage.setItem(key, json);
	}

	override async memorize(embedding: Embedding, memory: MemoryID): Promise<void> {
		const mem =this._loadMemory(memory, embedding);
		mem.items.push(embedding);
		this._saveMemory(memory);
	}

	override async recall(query: Embedding, memory: MemoryID, k: number): Promise<Embedding[]> {
		const mem = this._loadMemory(memory, query);
		return closestItems(mem.items, query, k);
	}

	override store(store: StoreID, key: StoreKey, value: StoreValue): void {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.store(store, key, value);
		}
		const [s] = this._loadStore(store);
		s.data[key] = value;
		this._saveStore(store);
	}

	override retrieve(store: StoreID, key: StoreKey): StoreValue | undefined {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.retrieve(store, key);
		}
		const [s] = this._loadStore(store);
		return s.data[key];
	}

	override delete(store: StoreID, key: StoreKey): boolean {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.delete(store, key);
		}
		const [s, created] = this._loadStore(store);
		if (created) return false;
		if (s.data[key] === undefined) return false;
		delete s.data[key];
		this._saveStore(store);
		return true;
	}

	override enumerateStores(): StoreID[] {
		const result : StoreID[] = [];
		for (const key of localStorageKeys()) {
			if (!key.startsWith(STORE_KEY_PREFIX)) continue;
			result.push(key.slice(STORE_KEY_PREFIX.length));
		}
		return result;
	}

	override enumerateMemories(): MemoryID[] {
		const result : MemoryID[] = [];
		for (const key of localStorageKeys()) {
			if (!key.startsWith(MEMORY_KEY_PREFIX)) continue;
			result.push(key.slice(MEMORY_KEY_PREFIX.length));
		}
		return result;
	}

	override async localFetch(location: SeedPacketAbsoluteLocalLocation): Promise<string> {
		//TODO: also stash local-but-actually-remotes here so they don't have to
		//be refetched if we already have them.
		return this._packets[location] || '';
	}
}