import  {
	SeedData,
	SeedPacket,
	EnvironmentData,
	AbsoluteSeedReference,
	SeedPacketAbsoluteLocation,
	SeedID,
	LocalJSONFetcher,
	seedPacket,
	SeedPacketAbsoluteLocalLocation,
	SeedPacketAbsoluteRemoteLocation
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	Seed
} from './seed.js';

import {
	isLocalLocation,
	seedReferenceToString
} from './reference.js';

export class Garden {
	_env : Environment;
	_seeds : {
		[location : SeedPacketAbsoluteLocation]: {
			[id : SeedID] : Seed
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

	async seed(ref : SeedID | AbsoluteSeedReference = '') : Promise<Seed> {
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
		if (isLocalLocation(location)) return this.fetchLocalSeedPacket(location);
		return this.fetchRemoteSeedPacket(location);
	}

	async fetchLocalSeedPacket(location : SeedPacketAbsoluteLocalLocation) : Promise<SeedPacket> {
		if (!isLocalLocation(location)) throw new Error('Not a local location');
		if (!this._fetcher) throw new Error(`No fetcher loaded to fetch packet ${location}`);
		const data = await this._fetcher(location);
		return seedPacket.parse(data);
	}

	async fetchRemoteSeedPacket(location : SeedPacketAbsoluteRemoteLocation) : Promise<SeedPacket> {
		if (isLocalLocation(location)) throw new Error('Not a remote location');
		const mock = this.environment.getKnownBooleanKey('mock');
		if (mock) {
			//TODO support mocked remote seed packets
			throw new Error('mocked remote seed packets aren\'t supported yet');
		}
		const result = await fetch(location, {
			method: 'GET'
		});
		const blob = await result.json();
		return seedPacket.parse(blob);
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
		//Ensure seed packet is shaped properly
		seedPacket.parse(packet);
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

