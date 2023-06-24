
import  {
	SeedData,
	SeedDataType,
	SeedPacketLocation,
	SeedReferenceID,
	UnpackedSeedReferenceID,
	Value
} from './types.js';

import {
	Garden
} from './garden.js';

import {
	grow
} from './grow.js';

import {
	unpackSeedReferenceID
} from './reference.js';

export class Seed<D extends SeedData = SeedData> {

	_garden : Garden;
	_id : SeedReferenceID;
	_unpackedID: UnpackedSeedReferenceID;
	_data : D;

	constructor(garden: Garden, id : SeedReferenceID, data : D) {
		this._garden = garden;
		this._id = id;
		this._unpackedID = unpackSeedReferenceID(id);
		this._data = data;
	}

	get id() : SeedReferenceID {
		return this._id;
	}

	get location() : SeedPacketLocation {
		return this._unpackedID.location;
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