import {
	Profile
} from '../src/profile.js';

import {
	LeafValue,
	MemoryID
} from '../src/types.js';

import {
	Embedding
} from '../src/embedding.js';

import {
	AssociativeMemory
} from './associative_memory.js';

import {
	ensureFolder
} from './util.js';

import fs from 'fs';
import path from 'path';

import inquirer from 'inquirer';

const PROFILE_DIRECTORY = '.profiles/';

const LOG_FILE = 'console.log';

export class ProfileFilesystem extends Profile {

	//basetype has a ._memories of a diffeerent type
	_associativeMemories : {[name : MemoryID]: AssociativeMemory};

	constructor() {
		super();
		this._associativeMemories = {};
	}

	override async localFetch(location : string) : Promise<unknown> {
		const file = fs.readFileSync(location).toString();
		return JSON.parse(file);
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
			const mock = garden.environment.getKnownBooleanKey('mock');
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
		if (this.garden?.environment.getKnownBooleanKey('mock')) {
			return await super.memorize(embedding, memory);
		}
		const mem = this.memory(embedding, memory);
		return await mem.memorize(embedding);
	}

	override async recall(query: Embedding, memory: MemoryID, k : number): Promise<Embedding[]> {
		if (this.garden?.environment.getKnownBooleanKey('mock')) {
			return await super.recall(query, memory, k);
		}
		const mem = this.memory(query, memory);
		return await mem.recall(query, k);
	}
}