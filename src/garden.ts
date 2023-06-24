import  {
	SeedData,
	SeedPacket,
	EnvironmentData,
	AbsoluteSeedReference,
	SeedPacketAbsoluteLocation,
	LocalSeedID,
	LocalJSONFetcher,
	seedPacket
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	Seed
} from './seed.js';

import {
	isFileLocation,
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
		//This will return early if it already is fetched
		await this.ensureSeedPacket(ref.location);
		const collection = this._seeds[ref.location];
		if (!collection) throw new Error('Unexpectedly no packet');
		const seed = collection[ref.id];
		if (!seed) throw new Error(`No seed with ID ${seedReferenceToString(ref)}`);
		return seed;
	}

	async fetchSeedPacket(location : SeedPacketAbsoluteLocation) : Promise<SeedPacket> {
		if (!isFileLocation(location)) throw new Error('https fetching is not yet supported');
		if (!this._fetcher) throw new Error(`No fetcher loaded to fetch packet ${location}`);
		const data = await this._fetcher(location);
		return seedPacket.parse(data);
	}

	async ensureSeedPacket(location: SeedPacketAbsoluteLocation) : Promise<void> {
		//Skip if it's already loaded.
		//TODO: allow a force to re-fetch them
		if (this._seeds[location]) return;
		const packet = await this.fetchSeedPacket(location);
		this.plantSeedPacket(location, packet);
		return;
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

