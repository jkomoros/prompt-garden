import {
	StoreID,
	StoreKey,
	StoreValue
} from '../src/types.js';

import {
	safeFileName
} from '../src/util.js';

import {
	ProfileFilesystem
} from './profile_filesystem.js';

import {
	ensureFolder
} from './util.js';

import path from 'path';
import fs from 'fs';

const STORE_DIR = 'store/';

type Data = {
	[key : StoreKey] : StoreValue
};

export class StoreFilesystem {
	_profile : ProfileFilesystem;
	_id : StoreID;
	_data? : Data;

	constructor(profile : ProfileFilesystem, id : StoreID) {
		this._profile = profile;
		this._id = id;
	}

	get dir() : string {
		return path.join(this._profile._profileDir, STORE_DIR);
	}

	get file() : string {
		return path.join(this.dir, safeFileName(this._id) + '.json');
	}

	_loadData() : Data {
		if (this._data) return this._data;
		let data : Data = {};
		if (fs.existsSync(this.file)) {
			const rawData = fs.readFileSync(this.file).toString();
			data = JSON.parse(rawData);
		}
		this._data = data;
		return data;
	}

	save() : void {
		if (!this._data) return;
		ensureFolder(this.dir);
		fs.writeFileSync(this.file, JSON.stringify(this._data, null, '\t'));
	}

	store(key : StoreKey, value : StoreValue) {
		const data = this._loadData();
		data[key] = value;
		this.save();
	}

	retrieve(key : StoreKey) : StoreValue | undefined  {
		const data = this._loadData();
		return data[key];
	}

	delete(key : StoreKey) {
		const data = this._loadData();
		if (data[key] === undefined) return;
		delete data[key];
		this.save();
	}
}