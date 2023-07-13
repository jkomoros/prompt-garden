import {
	EmbeddingModelID,
	MemoryID
} from '../src/types.js';

import {
	Embedding
} from '../src/embedding.js';

import {
	ProfileFilesystem
} from './profile_filesystem.js';

import {
	ensureFolder
} from './util.js';

import {
	safeName
} from '../src/util.js';

import {
	EMBEDDINGS_BY_MODEL
} from '../src/providers/index.js';

import fs from 'fs';
import path from 'path';
import hnswlib from 'hnswlib-node';

const MEMORY_DIR = 'memory/';

const HNSW_FILE = 'hnsw.db';

const METADATA_FILE = 'text.json';

export class AssociativeMemory {

	_profile : ProfileFilesystem;
	_id : MemoryID;
	_dim : number;
	_model : EmbeddingModelID;
	//It's temp because we'll switch to a proper db.
	_tempMetadata? : {
		[id : string]: string
	};
	_hnsw? : hnswlib.HierarchicalNSW;

	constructor(profile : ProfileFilesystem, exampleEmbedding : Embedding, id : MemoryID) {
		this._profile = profile;
		this._model = exampleEmbedding.model;
		this._dim = exampleEmbedding.vector.length;
		this._id = id;
	}

	get dir() : string {
		return path.join(this._profile._profileDir, MEMORY_DIR, safeName(this._id), safeName(this._model));
	}

	get memoryFile() : string {
		return path.join(this.dir, HNSW_FILE);
	}

	get metadataFile() : string {
		return path.join(this.dir, METADATA_FILE);
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
			//We'll start small and keep growing if necessary.
			hnsw.initIndex(32);
		}
		this._hnsw = hnsw;
		return hnsw;
	}

	_getMetadata() : {[id : string]: string} {
		if (!this._tempMetadata) {
			const file = this.metadataFile;
			if (fs.existsSync(file)) {
				const data = fs.readFileSync(file).toString();
				this._tempMetadata = JSON.parse(data) as {[id : string] : string};
			} else {
				this._tempMetadata = {};
			}
		}
		return this._tempMetadata;
	}

	async save() : Promise<void> {
		ensureFolder(this.dir);
		const hsnw = await this._getHNSW();
		await hsnw.writeIndex(this.memoryFile);
		const metadata = this._getMetadata();
		fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, '\t'));
	}

	async memorize(embedding : Embedding) : Promise<void> {
		const hsnw = await this._getHNSW(true);
		//hsnw requires an integer key, so do one higher than has ever been in it.
		const id = hsnw.getCurrentCount();
		//Double the index size if we were about to run over.
		if (id >= hsnw.getMaxElements()) {
			const newSize = hsnw.getMaxElements() * 2;
			this._profile.verboseLog(`Resizing hnsw index to ${newSize}`);
			hsnw.resizeIndex(newSize);
		}
		//TODO: check if we're about to be too big, and if so double the size.
		hsnw.addPoint(embedding.vector, id);
		const metadata = this._getMetadata();
		//TODO: actually store these in a proper DB.
		metadata[String(id)] = embedding.text;
		//TODO: only save every so often instead of constantly.
		await this.save();
		return;
	}

	async recall(query : Embedding, k : number) : Promise<Embedding[]> {
		//We do want it to be created if it doesn't exist, becuase otherwise how
		//would you learn that there are no items?
		const hsnw = await this._getHNSW(true);
		const results = hsnw.searchKnn(query.vector, k);
		const constructor = EMBEDDINGS_BY_MODEL[query.model].constructor;
		const metadata = this._getMetadata();
		return results.neighbors.map(neighbor => {
			return new constructor(hsnw.getPoint(neighbor), metadata[String(neighbor)]);
		});
	}

}