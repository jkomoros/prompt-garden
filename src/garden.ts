import  {
	SeedReferenceID,
	SeedData,
	SeedPacket,
	EnvironmentData,
	SeedPacketLocation
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	Seed
} from './seed.js';

import {
	packSeedReferenceID,
	unpackSeedReferenceID
} from './reference.js';

export class Garden {
	_env : Environment;
	_seeds : {
		[location : SeedPacketLocation]: {
			[id : SeedReferenceID] : Seed
		}
	};
	_location? : SeedPacketLocation;

	constructor(environment : EnvironmentData) {
		this._env = new Environment(environment);
		this._seeds = {};
	}

	get environment() : Environment {
		return this._env;
	}

	//Returns the location of the first seed packet loaded.
	get location() : SeedPacketLocation | undefined {
		return this._location;
	}

	seed(id : SeedReferenceID = '') : Seed {
		const unpacked = unpackSeedReferenceID(id, this.location);
		const collection = this._seeds[unpacked.location];
		if (!collection) throw new Error(`No seed with ID ${id}`);
		const seed = collection[unpacked.id];
		if (!seed) throw new Error(`No seed with ID ${id}`);
		return seed;
	}

	plantSeed(id : SeedReferenceID, data : SeedData) {
		const unpacked = unpackSeedReferenceID(id, this.location);
		if (this._seeds[unpacked.location] == undefined) {
			this._seeds[unpacked.location] = {};
		}
		this._seeds[unpacked.location][unpacked.id] = new Seed(this, id, data);
	}

	plantSeedPacket(location: SeedPacketLocation, packet: SeedPacket) {
		if (!this._location) this._location = location;
		for (const [localID, seed] of Object.entries(packet.seeds)) {
			const id = packSeedReferenceID(location, localID);
			this.plantSeed(id, seed);
		}
	}

}

