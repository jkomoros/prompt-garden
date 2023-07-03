import {
	DEFAULT_MEMORY_NAME,
	Profile
} from '../src/profile.js';

import {
	LeafValue,
	MemoryID
} from '../src/types.js';

import {
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

export class ProfileFilesystem extends Profile {

	//It's temp because we'll switch to a proper db.
	_tempEmbeddingMap : {
		[id : number]: Embedding
	};

	constructor() {
		super();
		this._tempEmbeddingMap = {};
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

	_memoryDir(exampleEmbedding : Embedding, memory : MemoryID) : string {
		return path.join(this._profileDir, MEMORY_DIR, safeFileName(memory), safeFileName(exampleEmbedding.model));
	}

	async _hsnw(exampleEmbedding : Embedding, memory: MemoryID, createIfNotExist? : boolean) : Promise<hnswlib.HierarchicalNSW> {
		//TODO: memoize hsnw readers keyed off of memory
		const memoryFolder = this._memoryDir(exampleEmbedding, memory);
		ensureFolder(memoryFolder);
		const memoryFile = path.join(memoryFolder, HNSW_FILE);
		const memoryExists = fs.existsSync(memoryFile);
		if (!memoryExists && !createIfNotExist) throw new Error(`${memory} had no items in it`);
		const dim = exampleEmbedding.vector.length;
		const hnsw = new hnswlib.HierarchicalNSW('cosine', dim);
		if (memoryExists) {
			await hnsw.readIndex(memoryFile);
		} else {
			//TODO: set this value better.
			hnsw.initIndex(100);
		}
		return hnsw;
	}

	async _saveHsnw(hsnw : hnswlib.HierarchicalNSW, exampleEmbedding : Embedding, memory: MemoryID) : Promise<void> {
		const memoryFile = path.join(this._memoryDir(exampleEmbedding, memory), HNSW_FILE);
		await hsnw.writeIndex(memoryFile);
	}

	override async memorize(embedding: Embedding, memory: MemoryID = DEFAULT_MEMORY_NAME): Promise<void> {
		const hsnw = await this._hsnw(embedding, memory, true);
		//hsnw requires an integer key, so do one higher than has ever been in it.
		const id = hsnw.getCurrentCount();
		//TODO: check if we're about to be too big, and if so double the size.
		hsnw.addPoint(embedding.vector, id);
		//TODO: only save every so often instead of constantly.
		await this._saveHsnw(hsnw, embedding, memory);
		//TODO: actually store these in a proper DB.
		this._tempEmbeddingMap[id] = embedding;
		return;
	}

	override async recall(query: Embedding, memory: MemoryID = DEFAULT_MEMORY_NAME, k?: number): Promise<Embedding[]> {
		//This will throw if it doesn't exist.
		const hsnw = await this._hsnw(query, memory);
		//TODO: handle defaulting in an organized way
		if (!k) k = 5;
		const results = hsnw.searchKnn(query.vector, k);
		//TODO: reconstruct embeddings of the right type based on the constructor.
		//TODO: retrieve from a proper DB.
		return results.neighbors.map(neighbor => this._tempEmbeddingMap[neighbor]);
	}
}