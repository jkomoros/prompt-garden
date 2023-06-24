
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
	seedData
} from './types.js';

import {
	Garden
} from './garden.js';

import {
	grow
} from './grow.js';

//expandSeedData adds itself (and any sub-seeds) to the result
const expandSeedData = (idFromParent : SeedID, data : SeedData, result : ExpandedSeedPacket) : void => {
	//Note: the sub-properties of data might be nested SeedData, but Typescript
	//doesn't realize that. See the comment in makeNestedSeedData.
	
	const resultData = {...data} as ExpandedSeedData;
	for (const [key, value] of Object.entries(data)) {
		//if it's a reserved key, a normal value, or a SeedReference, then the copied over value is fine.

		//Even though Typescript doesn't realize the value might be a SeedData, zod won't be fooled.
		if (!seedData.safeParse(value).success) continue;
		//It's a nested seedData! This requires us to recurse.

		//For now just barf.

		//TODO: actually do sub-processing

		throw new Error(`Nested seeds discovered in ${idFromParent}.${key} but they are not yet supported`);
	}
	//For now just add all seeds, an effective pass-through
	result.seeds[idFromParent] = resultData;
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