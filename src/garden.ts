import  {
	SeedData,
	SeedPacket,
	EnvironmentData,
	AbsoluteSeedReference,
	SeedPacketAbsoluteLocation,
	LocalSeedID,
	LocalJSONFetcher
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	Seed
} from './seed.js';

import {
	seedReferenceToString
} from './reference.js';

export class Garden {
	_env : Environment;
	_seeds : {
		[location : SeedPacketAbsoluteLocation]: {
			[id : LocalSeedID] : Seed
		}
	};
	_location? : SeedPacketAbsoluteLocation;
	_fetcher? : LocalJSONFetcher;

	constructor(environment : EnvironmentData, fetcher? : LocalJSONFetcher) {
		this._env = new Environment(environment);
		this._seeds = {};
		//This might import a non-browser-OK fs function so we need it to be injected.
		this._fetcher = fetcher;
	}

	get environment() : Environment {
		return this._env;
	}

	//Returns the location of the first seed packet loaded.
	get location() : SeedPacketAbsoluteLocation | undefined {
		return this._location;
	}

	async seed(ref : LocalSeedID | AbsoluteSeedReference = '') : Promise<Seed> {
		if (typeof ref == 'string') {
			ref = {
				location: this.location || '',
				id: ref
			};
		}
		const collection = this._seeds[ref.location];
		if (!collection) throw new Error(`No seed with ID ${seedReferenceToString(ref)}`);
		const seed = collection[ref.id];
		if (!seed) throw new Error(`No seed with ID ${seedReferenceToString(ref)}`);
		return seed;
	}

	plantSeed(ref : AbsoluteSeedReference, data : SeedData) {
		if (this._seeds[ref.location] == undefined) {
			this._seeds[ref.location] = {};
		}
		this._seeds[ref.location][ref.id] = new Seed(this, ref, data);
	}

	plantSeedPacket(location: SeedPacketAbsoluteLocation, packet: SeedPacket) {
		if (!this._location) this._location = location;
		for (const [id, seed] of Object.entries(packet.seeds)) {
			const ref : AbsoluteSeedReference = {
				location,
				id
			};
			this.plantSeed(ref, seed);
		}
	}

}

