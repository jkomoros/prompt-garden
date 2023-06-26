import  {
	ExpandedSeedData,
	SeedPacket,
	EnvironmentData,
	SeedReference,
	SeedPacketAbsoluteLocation,
	SeedID,
	LocalJSONFetcher,
	seedPacket,
	SeedPacketAbsoluteLocalLocation,
	SeedPacketAbsoluteRemoteLocation,
	AbsoluteSeedReference,
	PackedSeedReference,
	GardenOptions,
	Prompter,
	LeafValue
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	Seed, expandSeedPacket
} from './seed.js';

import {
	PACKED_SEED_REFERENCE_DELIMITER,
	isLocalLocation,
	makeAbsolute,
	packSeedReference,
	unpackSeedReference
} from './reference.js';

export class Garden {
	_env : Environment;
	_seeds : {
		[location : SeedPacketAbsoluteLocation]: {
			[id : SeedID] : Seed
		}
	};
	_seedsByID: {
		[id : SeedID]: SeedReference[]
	};
	_location? : SeedPacketAbsoluteLocation;
	_fetcher? : LocalJSONFetcher;
	_prompter? : Prompter;

	constructor(environment : EnvironmentData, opts? : GardenOptions) {
		if (!opts) opts = {};
		this._env = new Environment(environment);
		this._seeds = {};
		this._seedsByID = {};
		//This might import a non-browser-OK fs function so we need it to be injected.
		this._fetcher = opts.fetcher;
		this._prompter = opts.prompter;
	}

	get environment() : Environment {
		return this._env;
	}

	//Returns the location of the first seed packet loaded.
	get location() : SeedPacketAbsoluteLocation | undefined {
		return this._location;
	}

	async prompt(question : string, defaultValue : LeafValue) : Promise<string> {
		if (this._prompter) return this._prompter(question, defaultValue);
		return prompt(question, String(defaultValue)) || '';
	}
	
	//TODO: allow a thing that accepts a packedSeedReference, and plug it it
	//into seed() so the command line naturally passes to it.

	//seedReferenceForID returns a seed reference for the given ID if one
	//exists, across any packet. If there is only one item in any packet with
	//the given ID, it will return that. If there are multiple, it will return
	//the one in the first-loaded seed packet, if one matches. If not, it will
	//return a random one.
	seedReferenceForID(id : SeedID) : SeedReference | undefined {
		const options = this._seedsByID[id] || [];
		if (options.length == 0) return undefined;
		if (options.length == 1) return options[0];
		for (const ref of options) {
			if (ref.packet == this.location) return ref;
		}
		return options[0];
	}

	//seed fetches a seed with the given reference or ID. It is a promise
	//because if it relies on a seed packet that is not yet loaded it will
	//attempt to load the seed packet.
	async seed(ref : SeedID | PackedSeedReference | SeedReference = '') : Promise<Seed> {
		if (typeof ref == 'string') {
			if (ref.includes(PACKED_SEED_REFERENCE_DELIMITER)) {
				ref = unpackSeedReference(ref, this.location || '');
			} else {
				const newRef = this.seedReferenceForID(ref);
				if (!newRef) throw new Error(`No seed matching ID ${ref} found`);
				ref = newRef;
			}
		}
		const absoluteRef = makeAbsolute(ref, this.location || '');
		//This will return early if it already is fetched
		await this.ensureSeedPacket(absoluteRef.packet);
		const collection = this._seeds[absoluteRef.packet];
		if (!collection) throw new Error('Unexpectedly no packet');
		const seed = collection[ref.id];
		if (!seed) throw new Error(`No seed with ID ${packSeedReference(ref)}`);
		return seed;
	}

	async fetchSeedPacket(location : SeedPacketAbsoluteLocation) : Promise<SeedPacket> {
		if (isLocalLocation(location)) return this.fetchLocalSeedPacket(location);
		return this.fetchRemoteSeedPacket(location);
	}

	async fetchLocalSeedPacket(location : SeedPacketAbsoluteLocalLocation) : Promise<SeedPacket> {
		if (!isLocalLocation(location)) throw new Error('Not a local location');
		if (!this._fetcher) throw new Error(`No fetcher loaded to fetch packet ${location}`);
		const verbose = this.environment.getKnownBooleanKey('verbose');
		if (verbose) {
			console.log(`Fetching local seed packet: ${location}`);
		}
		const data = await this._fetcher(location);
		return seedPacket.parse(data);
	}

	async fetchRemoteSeedPacket(location : SeedPacketAbsoluteRemoteLocation) : Promise<SeedPacket> {
		if (isLocalLocation(location)) throw new Error('Not a remote location');
		const mock = this.environment.getKnownBooleanKey('mock');
		if (mock) {
			//TODO support mocked remote seed packets and test
			throw new Error('mocked remote seed packets aren\'t supported yet');
		}
		const verbose = this.environment.getKnownBooleanKey('verbose');
		if (verbose) {
			console.log(`Fetching remote seed packet: ${location}`);
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

	plantSeed(ref : AbsoluteSeedReference, data : ExpandedSeedData) {
		if (this._seeds[ref.packet] == undefined) {
			this._seeds[ref.packet] = {};
		}
		this._seeds[ref.packet][ref.id] = new Seed(this, ref, data);
		if (!this._seedsByID[ref.id]) this._seedsByID[ref.id] = [];
		this._seedsByID[ref.id].push(ref);
	}

	plantSeedPacket(location: SeedPacketAbsoluteLocation, packet: SeedPacket) {
		//Ensure seed packet is shaped properly
		seedPacket.parse(packet);
		const expandedPacket = expandSeedPacket(packet);
		if (!this._location) this._location = location;
		for (const [id, seed] of Object.entries(expandedPacket.seeds)) {
			const ref : AbsoluteSeedReference = {
				packet: location,
				id
			};
			this.plantSeed(ref, seed);
		}
	}

}

