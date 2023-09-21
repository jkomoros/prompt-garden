import {
	Profile
} from '../src/profile.js';

import {
	EmbeddingModelID,
	LeafValue,
	MemoryID,
	RawEmbeddingVector,
	SeedPacketAbsoluteLocalLocation,
	StoreID,
	StoreKey,
	StoreValue,
	memoryID,
	seedPacketAbsoluteRemoteLocation,
	storeID,
	urlDomain
} from '../src/types.js';

import {
	StoreFilesystem
} from './store_filesystem.js';

import {
	Embedding
} from '../src/embedding.js';

import {
	AssociativeMemory
} from './associative_memory.js';

import {
	ensureFolder
} from './util.js';

import {
	stringHash,
	safeName
} from '../src/util.js';

import {
	Garden
} from '../src/garden.js';

import {
	z
} from 'zod';

import fs from 'fs';
import path from 'path';

import inquirer from 'inquirer';

const PROFILE_DIRECTORY = '.profiles/';
const CACHE_DIRECTORY = 'cache';
const EMBEDDINGS_DIRECTORY = 'embeddings';
const EMBEDDING_FILE_EXTENSION = '.bin';

const LOG_FILE = 'console.log';
const METADATA_FILE = 'info.json';

const CURRENT_PROFILE_VERSION = 0;

const profileMetadata = z.object({
	version: z.literal(0),
	//We have to store stores and memories in the metadata because just looking at the
	//filesystem won't allow us to retreive the names because safeName mangles
	//name in an unreversible way.
	stores: z.record(storeID, z.literal(true)),
	memories: z.record(memoryID, z.literal(true)),
	allowedFetches: z.record(
		seedPacketAbsoluteRemoteLocation,
		z.record(urlDomain, z.literal(true))
	)
});

type ProfileMetadata = z.infer<typeof profileMetadata>;

const vectorToBuffer = (vector : number[]) : Buffer => {
	// Assuming the floats are 32-bit (4 bytes) in this example
	const buffer = Buffer.alloc(vector.length * 4);
	for (let i = 0; i < vector.length; i++) {
		buffer.writeFloatLE(vector[i], i * 4);
	}
	return buffer;
};

const bufferToVector = (buffer : Buffer) : number[] => {
	const arr: number[] = [];
	for (let i = 0; i < buffer.length; i += 4) {
		arr.push(buffer.readFloatLE(i));
	}
	return arr;
};

export class ProfileFilesystem extends Profile {

	//basetype has a ._memories of a diffeerent type
	_associativeMemories : {[name : MemoryID]: AssociativeMemory};
	_storeFilesystems : {[name : StoreID] : StoreFilesystem};

	//We keep a map of id to true because these are ones we know about from
	//metadata but might not have a live version of yet.
	_associativeMemoryIDs : {[name : MemoryID] : true};
	_storeFilesystemIDs : {[name : StoreID] : true};

	_loaded : boolean;

	constructor() {
		super();
		this._associativeMemories = {};
		this._associativeMemoryIDs = {};
		this._storeFilesystems = {};
		this._storeFilesystemIDs = {};
		this._loaded = false;
		//We can't call _loadMetadata yet because garden hasn't been set
	}

	override set garden(val : Garden) {
		super.garden = val;
		this._loadMetadata();
	}

	override get garden() : Garden | undefined {
		//Note that apparently according to the ES spec, if you override the setter you also have to override the getter.
		return super.garden;
	}

	override async allowFetch(remotePacketLocation: string, domain: string): Promise<boolean> {
		if (this._allowedFetches[remotePacketLocation]) {
			if (this._allowedFetches[remotePacketLocation][domain]) return true;
		}
		const ALLOW_ONCE = 'Allow once';
		const ALLOW_FOREVER = 'Allow forever';
		const DISALLOW = 'Disallow';
		const answers = await inquirer.prompt([
			{
				name: 'question',
				type: 'list',
				message: `Do you want to allow a seed from ${remotePacketLocation} to fetch from domain ${domain}?`,
				choices: [ALLOW_ONCE, ALLOW_FOREVER, DISALLOW],
				default: ALLOW_ONCE
			}
		]);
		const answer = answers.question as string;
		if (answer == DISALLOW) return false;
		if (answer == ALLOW_ONCE) return true;
		//They want to save the answer
		if (!this._allowedFetches[remotePacketLocation]) this._allowedFetches[remotePacketLocation] = {};
		this._allowedFetches[remotePacketLocation][domain] = true;
		this._saveMetadata();
		return true;
	}

	_loadMetadata() : void {
		
		const metadataFile = path.join(this._profileDir, METADATA_FILE);
		if (!fs.existsSync(metadataFile)) {
			this._saveMetadata();
		}

		//For now all we do is validate the version is right.
		const data = fs.readFileSync(metadataFile).toString();
		const parsedData = profileMetadata.parse(JSON.parse(data));
		if (parsedData.version != CURRENT_PROFILE_VERSION) throw new Error('Profile has a different version than expected');
		this._loaded = true;
		this._allowedFetches = parsedData.allowedFetches;
		this._storeFilesystemIDs = parsedData.stores;
		this._associativeMemoryIDs = parsedData.memories;
	}

	_saveMetadata() : void {
		const metadataFile = path.join(this._profileDir, METADATA_FILE);
		const data : ProfileMetadata = {
			version: 0,
			memories: this._associativeMemoryIDs,
			stores: this._storeFilesystemIDs,
			allowedFetches: this._allowedFetches
		};
		ensureFolder(this._profileDir);
		fs.writeFileSync(metadataFile, JSON.stringify(data, null, '\t'));
	}

	override getCachedEmbeddingVector(model: EmbeddingModelID, text: string): RawEmbeddingVector | undefined {
		const h = stringHash(text);
		const filename = path.join(this._cacheFolderForModel(model), h + EMBEDDING_FILE_EXTENSION);
		if (!fs.existsSync(filename)) return undefined;
		const buffer = fs.readFileSync(filename);
		return bufferToVector(buffer);
	}

	override cacheEmbeddingVector(model: EmbeddingModelID, text: string, vector: RawEmbeddingVector): void {
		const embeddingCacheFolder = this._cacheFolderForModel(model);
		ensureFolder(embeddingCacheFolder);
		const h = stringHash(text);
		const data = vectorToBuffer(vector);
		const filename = path.join(embeddingCacheFolder, h + EMBEDDING_FILE_EXTENSION);
		fs.writeFileSync(filename, data);
	}

	override async localFetch(location : SeedPacketAbsoluteLocalLocation) : Promise<string> {
		return fs.readFileSync(location).toString();
	}

	override async confirm(question : string) : Promise<boolean> {
		const answers = await inquirer.prompt([{
			name: 'question',
			type: 'confirm',
			message: question,
		}]);
		return answers.question;
	}

	override async prompt(question: string, defaultValue: LeafValue, choices? : string[]): Promise<string> {
		const answers = await inquirer.prompt([{
			name: 'question',
			type: 'input',
			message: question,
			default: defaultValue,
			choices
		}]);
		return answers.question;
	}

	_cacheFolderForModel(model : EmbeddingModelID) : string {
		return path.join(this._profileDir, CACHE_DIRECTORY, EMBEDDINGS_DIRECTORY, safeName(model));
	}

	get _profileDir() : string {
		const garden = this.garden;
		if (!garden) throw new Error('Garden not yet set');
		const profile = garden.environment.getKnownSecretKey('profile');
		if (!profile) throw new Error('Profile not set');
		return path.join(PROFILE_DIRECTORY, String(profile));
	}

	override log(message?: unknown, ...optionalParams: unknown[]): void {
		const garden = this.garden;
		if (garden) {
			const mock = garden.environment.getKnownProtectedKey('mock');
			if (!mock) {
				ensureFolder(this._profileDir);
				const logFile = path.join(this._profileDir, LOG_FILE);
				//TODO: better output style (e.g. timestamps, maybe JSON-LD),
				//and don't drop optionalParams.
				fs.appendFileSync(logFile, message + '\n');
			}
		}
		super.log(message, ...optionalParams);
	}

	memory(exampleEmbedding : Embedding, memory : MemoryID) : AssociativeMemory {
		if (!this._associativeMemories[memory]) {
			this._associativeMemories[memory] = new AssociativeMemory(this, exampleEmbedding, memory);
			this._associativeMemoryIDs[memory] = true;
			this._saveMetadata();
		}
		return this._associativeMemories[memory];
	}

	override async memorize(embedding: Embedding, memory: MemoryID): Promise<void> {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return await super.memorize(embedding, memory);
		}
		const mem = this.memory(embedding, memory);
		return await mem.memorize(embedding);
	}

	override async recall(query: Embedding, memory: MemoryID, k : number): Promise<Embedding[]> {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return await super.recall(query, memory, k);
		}
		const mem = this.memory(query, memory);
		return await mem.recall(query, k);
	}

	storeFilesystem(id : StoreID) : StoreFilesystem {
		if (!this._storeFilesystems[id]) {
			this._storeFilesystems[id] = new StoreFilesystem(this, id);
			this._storeFilesystemIDs[id] = true;
			this._saveMetadata();
		}
		return this._storeFilesystems[id];
	}

	override store(store: StoreID, key: StoreKey, value: StoreValue): void {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.store(store, key, value);
		}
		const filesystem = this.storeFilesystem(store);
		filesystem.store(key, value);
	}

	override retrieve(store: StoreID, key: StoreKey): StoreValue | undefined {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.retrieve(store, key);
		}
		const filesystem = this.storeFilesystem(store);
		return filesystem.retrieve(key);
	}

	override delete(store : StoreID, key : StoreKey) : boolean {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.delete(store, key);
		}
		const filesystem = this.storeFilesystem(store);
		return filesystem.delete(key);
	}

	override enumerateStores(): StoreID[] {
		return Object.keys(this._storeFilesystemIDs);
	}

	override enumerateMemories(): MemoryID[] {
		return Object.keys(this._associativeMemoryIDs);
	}
}