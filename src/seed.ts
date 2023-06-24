
import  {
	AbsoluteSeedReference,
	SeedID,
	SeedData,
	SeedDataType,
	SeedPacketAbsoluteLocation,
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
	_ref : AbsoluteSeedReference;
	_data : D;

	constructor(garden: Garden, ref : AbsoluteSeedReference, data : D) {
		this._garden = garden;
		this._ref = ref;
		this._data = data;
		if (data.id !== undefined && data.id != ref.id) throw new Error('ID provided in seed data did not match ID');
	}

	get id() : SeedID {
		return this._ref.id;
	}

	get ref() : AbsoluteSeedReference {
		return this._ref;
	}

	get garden() : Garden {
		return this._garden;
	}

	get location() : SeedPacketAbsoluteLocation {
		return this._ref.packet;
	}

	get type() : SeedDataType {
		return this.data.type;
	}

	get data() : D {
		return this._data;
	}

	async grow() : Promise<Value> {
		return grow(this);
	}
}