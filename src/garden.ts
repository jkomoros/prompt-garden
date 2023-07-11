import  {
	ExpandedSeedData,
	SeedPacket,
	EnvironmentData,
	SeedReference,
	SeedPacketAbsoluteLocation,
	SeedID,
	seedPacket,
	SeedPacketAbsoluteLocalLocation,
	SeedPacketAbsoluteRemoteLocation,
	AbsoluteSeedReference,
	PackedSeedReference,
	MermaidDiagramDefinition,
} from './types.js';

import {
	Environment
} from './environment.js';

import {
	Seed, expandSeedPacket, verifySeedPacket
} from './seed.js';

import {
	PACKED_SEED_REFERENCE_DELIMITER,
	isLocalLocation,
	makeAbsolute,
	packSeedReference,
	unpackSeedReference
} from './reference.js';

import {
	Profile
} from './profile.js';

import {
	safeName
} from './util.js';

import {
	TypedObject
} from './typed-object.js';

const mermaidSeedReference = (ref : SeedReference) : string => {
	//hypens also are not liked by mermaid
	return safeName(packSeedReference(ref)).split('-').join('_');
};

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
	_profile : Profile;

	constructor(environment : EnvironmentData, profile? : Profile) {
		this._env = new Environment(environment);
		this._seeds = {};
		this._seedsByID = {};
		if (!profile) profile = new Profile();
		this._profile = profile;
		profile.garden = this;
	}

	get environment() : Environment {
		return this._env;
	}

	//Returns the location of the first seed packet loaded.
	get location() : SeedPacketAbsoluteLocation | undefined {
		return this._location;
	}

	get profile() : Profile {
		return this._profile;
	}

	//TODO: allow a thing that accepts a packedSeedReference, and plug it it
	//into seed() so the command line naturally passes to it.

	optionsForID(id : SeedID) : SeedReference[] {
		return this._seedsByID[id] || [];
	}

	seedsByPacket(includePrivate = false) : {[packet : SeedPacketAbsoluteLocation]: Seed[]} {
		const result : {[packet : SeedPacketAbsoluteLocation]: Seed[]} = {};
		for (const [packet, seeds] of Object.entries(this._seeds)) {
			const resultSeeds : Seed[] = [];
			for (const seed of Object.values(seeds)) {
				if (seed.private && !includePrivate) continue;
				resultSeeds.push(seed);
			}
			if (resultSeeds.length) result[packet] = resultSeeds;
		}
		return result;
	}

	//seedReferenceForID returns a seed reference for the given ID if one
	//exists, across any packet. If there is only one item in any packet with
	//the given ID, it will return that. If there are multiple, it will return
	//the one in the first-loaded seed packet, if one matches. If not, it will
	//return a random one.
	seedReferenceForID(id : SeedID) : SeedReference | undefined {
		const options = this.optionsForID(id);
		if (options.length == 0) return undefined;
		if (options.length == 1) return options[0];
		for (const ref of options) {
			if (ref.packet == this.location) return ref;
		}
		return options[0];
	}

	//seed fetches a seed with the given reference or ID. It is a promise
	//because if it relies on a seed packet that is not yet loaded it will
	//attempt to load the seed packet. If noFetch is true and a packet is not
	//loaded, it will error.
	async seed(ref : SeedID | PackedSeedReference | SeedReference = '', noFetch = false) : Promise<Seed> {
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
		await this.ensureSeedPacket(absoluteRef.packet, noFetch);
		const collection = this._seeds[absoluteRef.packet];
		if (!collection) throw new Error('Unexpectedly no packet');
		const seed = collection[ref.seed];
		if (!seed) throw new Error(`No seed with ID ${packSeedReference(ref)}`);
		return seed;
	}

	async fetchSeedPacket(location : SeedPacketAbsoluteLocation) : Promise<SeedPacket> {
		if (isLocalLocation(location)) return this.fetchLocalSeedPacket(location);
		return this.fetchRemoteSeedPacket(location);
	}

	async fetchLocalSeedPacket(location : SeedPacketAbsoluteLocalLocation) : Promise<SeedPacket> {
		if (!isLocalLocation(location)) throw new Error('Not a local location');
		const verbose = this.environment.getKnownBooleanKey('verbose');
		if (verbose) {
			this.profile.log(`Fetching local seed packet: ${location}`);
		}
		const data = await this.profile.localFetch(location);
		return seedPacket.parse(data);
	}

	async fetchRemoteSeedPacket(location : SeedPacketAbsoluteRemoteLocation) : Promise<SeedPacket> {
		if (isLocalLocation(location)) throw new Error('Not a remote location');
		const mock = this.environment.getKnownProtectedKey('mock');
		if (mock) {
			//TODO support mocked remote seed packets and test
			throw new Error('mocked remote seed packets aren\'t supported yet');
		}
		const verbose = this.environment.getKnownBooleanKey('verbose');
		if (verbose) {
			this.profile.log(`Fetching remote seed packet: ${location}`);
		}
		const result = await fetch(location, {
			method: 'GET'
		});
		const blob = await result.json();
		return seedPacket.parse(blob);
	}

	async ensureSeedPacket(location: SeedPacketAbsoluteLocation, noFetch = false) : Promise<void> {
		//Skip if it's already loaded.
		//TODO: allow a force to re-fetch them
		if (this._seeds[location]) return;
		if (noFetch) throw new Error(`${location} was not yet fetched and noFetch was passed`);
		const packet = await this.fetchSeedPacket(location);
		this.plantSeedPacket(location, packet);
		return;
	}

	plantSeed(ref : AbsoluteSeedReference, data : ExpandedSeedData, environmentOverlay? : EnvironmentData) {
		if (this._seeds[ref.packet] == undefined) {
			this._seeds[ref.packet] = {};
		}
		this._seeds[ref.packet][ref.seed] = new Seed(this, ref, data, environmentOverlay);
		if (!this._seedsByID[ref.seed]) this._seedsByID[ref.seed] = [];
		this._seedsByID[ref.seed].push(ref);
	}

	//Will throw if an error is discovered in the packet, but will return an
	//array of warnings if any warnings are found.
	plantSeedPacket(location: SeedPacketAbsoluteLocation, packet: SeedPacket) : Error[] | null {
		//Ensure seed packet is shaped properly
		seedPacket.parse(packet);
		const expandedPacket = expandSeedPacket(packet);
		//This will throw if there are errors in the packet.
		const warnings = verifySeedPacket(location, expandedPacket);
		if (!this._location) this._location = location;
		for (const [id, seed] of Object.entries(expandedPacket.seeds)) {
			const ref : AbsoluteSeedReference = {
				packet: location,
				seed: id
			};
			this.plantSeed(ref, seed, expandedPacket.environment);
		}
		return warnings;
	}

	async diagram(includePrivate = false) : Promise<MermaidDiagramDefinition> {
		const lines = [
			'flowchart TB'
		];
		const locations = TypedObject.keys(this._seeds);
		const locationsMap = Object.fromEntries(locations.map(location => [location, true]));
		//We need the first time a seed shows up to be in its subgroup. So discover all remote seeds now.
		const remoteRefsByLocation : {[location : SeedPacketAbsoluteRemoteLocation] : AbsoluteSeedReference[]} = {};
		for (const location of Object.keys(locationsMap)) {
			const seeds = this._seeds[location] || [];
			for (const seed of Object.values(seeds)) {
				if (seed.private && !includePrivate) continue;
				for (const ref of Object.values(seed.references())) {
					//if it's not in our list of locations to enumerate then we'll treat it as remote
					if (ref.packet && !locationsMap[ref.packet]) {
						if (!remoteRefsByLocation[ref.packet]) remoteRefsByLocation[ref.packet] = [];
						remoteRefsByLocation[ref.packet].push(ref);
					}
				}
			}
		}
		//Print out remote seeds.
		for (const [location, refs] of Object.entries(remoteRefsByLocation)) {
			lines.push('subgraph ' + location);
			lines.push('\t' + 'style ' + location + ' fill:#660000');
			for (const ref of refs) {
				lines.push('\t' + mermaidSeedReference(ref) + '[' + (ref.seed || '\'\'') + ']');
			}
			lines.push('end');
		}
		//Now print out normal seeds
		for (const location of Object.keys(locationsMap)) {
			const seeds = this._seeds[location] || [];
			lines.push('subgraph ' + location);
			for (const seed of Object.values(seeds)) {
				if (seed.private && !includePrivate) continue;
				lines.push('\t' + mermaidSeedReference(seed.ref) + '[' + (seed.id || '\'\'') + ']');
				if (seed.type == 'dynamic') lines.push('\tstyle ' + mermaidSeedReference(seed.ref) + ' fill:#006600');
				if (seed.private) lines.push('\tstyle ' + mermaidSeedReference(seed.ref) + ' fill:#333333');
				for (const [key, ref] of Object.entries(seed.references())) {
					if (locationsMap[ref.packet]) {
						//A local one
						const otherSeed = await this.seed(ref, true);
						if (otherSeed.private && !includePrivate) continue;
						lines.push('\t' + mermaidSeedReference(seed.ref) + '-->|' + key + '|' + mermaidSeedReference(ref));
					} else {
						//A remote one
						lines.push('\t' + mermaidSeedReference(seed.ref) + '-->|' + key + '|' + mermaidSeedReference(ref));
					}
				}
			}
			lines.push('end');
		}
		return lines.map((line, i) => i == 0 ? line : '\t' + line).join('\n');
	}

}

