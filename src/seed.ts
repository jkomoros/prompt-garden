
import  {
	LocalSeedID,
	SeedData,
	SeedDataType,
	Value
} from './types.js';

import {
	Garden
} from './garden.js';

import {
	grow
} from './grow.js';

export class Seed<D extends SeedData = SeedData> {

	_garden : Garden;
	_id : LocalSeedID;
	_data : D;

	constructor(garden: Garden, id : LocalSeedID, data : D) {
		this._garden = garden;
		this._id = id;
		this._data = data;
	}

	get id() : LocalSeedID {
		return this._id;
	}

	get type() : SeedDataType {
		return this.data.type;
	}

	get data() : D {
		return this._data;
	}

	async grow() : Promise<Value> {
		return grow(this._id, this.data, this._garden);
	}
}