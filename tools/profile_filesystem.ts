import {
	Profile
} from '../src/profile.js';

import {
	LeafValue,
	MemoryID,
	StoreID,
	StoreKey,
	StoreValue,
	seedPacketAbsoluteRemoteLocation,
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
	z
} from 'zod';

import fs from 'fs';
import path from 'path';

import inquirer from 'inquirer';
import { Garden } from '../src/garden.js';

const PROFILE_DIRECTORY = '.profiles/';

const LOG_FILE = 'console.log';
const METADATA_FILE = 'info.json';

const CURRENT_PROFILE_VERSION = 0;

const profileMetadata = z.object({
	version: z.literal(0),
	allowedFetches: z.record(
		seedPacketAbsoluteRemoteLocation,
		z.record(urlDomain, z.literal(true))
	)
});

type ProfileMetadata = z.infer<typeof profileMetadata>;

export class ProfileFilesystem extends Profile {

	//basetype has a ._memories of a diffeerent type
	_associativeMemories : {[name : MemoryID]: AssociativeMemory};
	_storeFilesystems : {[name : StoreID] : StoreFilesystem};
	_loaded : boolean;

	constructor() {
		super();
		this._associativeMemories = {};
		this._storeFilesystems = {};
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
	}

	_saveMetadata() : void {
		const metadataFile = path.join(this._profileDir, METADATA_FILE);
		const data : ProfileMetadata = {
			version: 0,
			allowedFetches: this._allowedFetches
		};
		ensureFolder(this._profileDir);
		fs.writeFileSync(metadataFile, JSON.stringify(data, null, '\t'));
	}

	override async localFetch(location : string) : Promise<string> {
		return fs.readFileSync(location).toString();
	}

	override async prompt(question: string, defaultValue: LeafValue): Promise<string> {
		const answers = await inquirer.prompt([{
			name: 'question',
			type: 'input',
			message: question,
			default: defaultValue
		}]);
		return answers.question;
	}

	get _profileDir() : string {
		const garden = this.garden;
		if (!garden) throw new Error('Garden not yet set');
		const profile = garden.environment.getKnownSecretKey('profile');
		if (!profile) throw new Error('Profile not set');
		return path.join(PROFILE_DIRECTORY, profile);
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
}