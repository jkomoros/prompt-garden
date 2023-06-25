
import  {
	AbsoluteSeedReference,
	SeedID,
	ExpandedSeedData,
	SeedDataType,
	SeedPacketAbsoluteLocation,
	Value,
	SeedPacket,
	SeedData,
	ExpandedSeedPacket,
	seedData,
	SeedReference
} from './types.js';

import {
	Garden
} from './garden.js';

import {
	grow
} from './grow.js';

//expandSeedData adds itself (and any sub-seeds) to the result. It returns the
//actual ID the seed decided on and registered itself with.
const expandSeedData = (idFromParent : SeedID, data : SeedData, result : ExpandedSeedPacket) : SeedID => {
	//Note: the sub-properties of data might be nested SeedData, but Typescript
	//doesn't realize that. See the comment in makeNestedSeedData, issue #16.

	const id = data.id !== undefined ? data.id : idFromParent;

	const resultData = {...data} as ExpandedSeedData;
	for (const [key, value] of Object.entries(data)) {
		//if it's a reserved key, a normal value, or a SeedReference, then the copied over value is fine.

		//Even though Typescript doesn't realize the value might be a SeedData, zod won't be fooled.
		if (!seedData.safeParse(value).success) continue;
		//It's a nested seedData! This requires us to recurse.

		const subSeedData = value as SeedData;

		const subID = id + '-' + key;
		const actualSubID = expandSeedData(subID, subSeedData, result);

		const subReference : SeedReference = {
			id: actualSubID
		};

		//Do a type cast to allow us to set the key, which we know is a legal key/value combination.
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(resultData as any)[key] = subReference;
	}

	result.seeds[id] = resultData;
	return id;
};

export const expandSeedPacket = (packet : SeedPacket) : ExpandedSeedPacket => {
	const result : ExpandedSeedPacket = {
		version: 0,
		seeds: {}
	};
	for (const [id, data] of Object.entries(packet.seeds)) {
		expandSeedData(id, data, result);
	}
	return result;
};

export class Seed<D extends ExpandedSeedData = ExpandedSeedData> {

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