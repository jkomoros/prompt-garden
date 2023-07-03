import {
	Profile
} from '../src/profile.js';

import {
	EmbeddingModelID,
	LeafValue,
	MemoryID
} from '../src/types.js';

import {
	EMBEDDINGS_BY_MODEL,
	Embedding
} from '../src/embedding.js';

import fs from 'fs';
import path from 'path';
import hnswlib from 'hnswlib-node';

import inquirer from 'inquirer';

const PROFILE_DIRECTORY = '.profiles/';

const MEMORY_DIR = 'memory/';

const HNSW_FILE = 'hnsw.db';

const LOG_FILE = 'console.log';

//eslint-disable-next-line no-useless-escape
const ILLEGAL_FILE_CHARS = /[\/\?<>\\:\*\|"]/g;

const safeFileName = (input : string) : string => {
	return input.replace(ILLEGAL_FILE_CHARS, '_');
};

const ensureFolder = (folderPath : string) : void => {
	const folders = folderPath.split(path.sep);

	let currentFolder = '';
	for (const folder of folders) {
		currentFolder = path.join(currentFolder, folder);
		if (!fs.existsSync(currentFolder)) {
			fs.mkdirSync(currentFolder);
		}
	}
};

class FilesystemMemory {

	_profile : ProfileFilesystem;
	_id : MemoryID;
	_dim : number;
	_model : EmbeddingModelID;
	//It's temp because we'll switch to a proper db.
	_tempEmbeddingMap : {
		[id : number]: Embedding
	};
	_hnsw? : hnswlib.HierarchicalNSW;

	constructor(profile : ProfileFilesystem, exampleEmbedding : Embedding, id : MemoryID) {
		this._profile = profile;
		this._model = exampleEmbedding.model;
		this._dim = exampleEmbedding.vector.length;
		this._id = id;
		this._tempEmbeddingMap = {};
	}

	get dir() : string {
		return path.join(this._profile._profileDir, MEMORY_DIR, safeFileName(this._id), safeFileName(this._model));
	}

	get memoryFile() : string {
		return path.join(this.dir, HNSW_FILE);
	}

	async _getHNSW(createIfNotExist? : boolean) : Promise<hnswlib.HierarchicalNSW> {
		if (this._hnsw) return this._hnsw;
		const memoryFolder = this.dir;
		ensureFolder(memoryFolder);
		const memoryFile = this.memoryFile;
		const memoryExists = fs.existsSync(memoryFile);
		if (!memoryExists && !createIfNotExist) throw new Error(`${this._id} had no items in it`);
		const hnsw = new hnswlib.HierarchicalNSW('cosine', this._dim);
		if (memoryExists) {
			await hnsw.readIndex(memoryFile);
		} else {
			//TODO: set this value better.
			hnsw.initIndex(100);
		}
		this._hnsw = hnsw;
		return hnsw;
	}

	async save() : Promise<void> {
		const hsnw = await this._getHNSW();
		await hsnw.writeIndex(this.memoryFile);
	}

	async memorize(embedding : Embedding) : Promise<void> {
		const hsnw = await this._getHNSW(true);
		//hsnw requires an integer key, so do one higher than has ever been in it.
		const id = hsnw.getCurrentCount();
		//TODO: check if we're about to be too big, and if so double the size.
		hsnw.addPoint(embedding.vector, id);
		//TODO: actually store these in a proper DB.
		this._tempEmbeddingMap[id] = embedding;
		//TODO: only save every so often instead of constantly.
		await this.save();
		return;
	}

	async recall(query : Embedding, k : number) : Promise<Embedding[]> {
		//This will throw if it doesn't exist.
		const hsnw = await this._getHNSW();
		const results = hsnw.searchKnn(query.vector, k);
		//TODO: retrieve from a proper DB.
		const constructor = EMBEDDINGS_BY_MODEL[query.model].constructor;
		
		return results.neighbors.map(neighbor => {
			const original = this._tempEmbeddingMap[neighbor];
			return new constructor(original.vector, original.text);
		});
	}

}

export class ProfileFilesystem extends Profile {

	//basetype has a ._memories of a diffeerent type
	_filesystemMemories : {[name : MemoryID]: FilesystemMemory};

	constructor() {
		super();
		this._filesystemMemories = {};
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

	memory(exampleEmbedding : Embedding, memory : MemoryID) : FilesystemMemory {
		if (!this._filesystemMemories[memory]) {
			this._filesystemMemories[memory] = new FilesystemMemory(this, exampleEmbedding, memory);
		}
		return this._filesystemMemories[memory];
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