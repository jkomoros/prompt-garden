
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
	SeedReference,
	nestedSeedDataObject,
	SeedDataObject,
	nestedSeedDataArray,
	SeedDataArray,
	seedReference,
	seedPacket,
	EnvironmentData,
	InputValueArray,
	InputValue,
	InputValueObject
} from './types.js';

import {
	Garden
} from './garden.js';

import {
	grow
} from './grow.js';

import { 
	Environment
} from './environment.js';

import {
	safeName
} from './util.js';

import {
	TypedObject
} from './typed-object.js';

//expandSeedData adds itself (and any sub-seeds) to the result. It returns the
//actual ID the seed decided on and registered itself with.
const expandSeedData = (idFromParent : SeedID, data : SeedData, result : ExpandedSeedPacket, makePrivate = false) : SeedID => {
	//Note: the sub-properties of data might be nested SeedData, but Typescript
	//doesn't realize that. See the comment in makeNestedSeedData, issue #16.

	const id = data.id !== undefined ? data.id : idFromParent;

	const resultSeed = {...data} as ExpandedSeedData;
	if (makePrivate && resultSeed.private !== false) resultSeed.private = true;
	let resultData = resultSeed as {[key : string]: Value | SeedReference | SeedData};

	//resultSeed and resultData are the same object in most cases, but not if
	//the seed is of type object, where we should basically do the normal
	//sub-seed expansion entirely within the properties argument.
	if (nestedSeedDataObject.safeParse(data).success) {
		const properties = (data as SeedDataObject).properties;
		resultData = {...properties};
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(resultSeed as SeedDataObject).properties = (resultData as any);
	}

	if (nestedSeedDataArray.safeParse(data).success) {
		const items = (data as SeedDataArray).items;
		//We can treat resultData as a normal object; iteration will work just
		//fine thanks to how javascript treats arrays.

		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		resultData = ([...items] as any) as {[key : string]: Value | SeedReference | SeedData};
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(resultSeed as SeedDataArray).items = (resultData as any);
	}

	for (const [key, value] of Object.entries(resultData)) {
		//if it's a reserved key, a normal value, or a SeedReference, then the copied over value is fine.

		//Even though Typescript doesn't realize the value might be a SeedData, zod won't be fooled.
		if (!seedData.safeParse(value).success) continue;
		//It's a nested seedData! This requires us to recurse.

		const subSeedData = value as SeedData;

		const subID = id + '-' + safeName(key);
		const actualSubID = expandSeedData(subID, subSeedData, result, true);

		const subReference : SeedReference = {
			seed: actualSubID
		};

		//Do a type cast to allow us to set the key, which we know is a legal key/value combination.
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(resultData as any)[key] = subReference;
	}
	if (result.seeds[id]) throw new Error(`A seed with id ${id} already existed`);
	result.seeds[id] = resultSeed;
	return id;
};

type ComingFrom = 'array' | 'object' | '';

/*

Technically if you want to have an object have values that are sub-seeds, you
have to wrap it in a `type:object`. But that's annoying to do (you have to wrap
the value in another object). As a pre-processing step, look for any
SeedReference or SeedData-looking items (that is, have either a `seed` or `type`
property) and put a `type:object` or `type:array` in front of their parent so
downstream parts of the pipeline don't have to think about it.

Returns the object or a copy that is a SeedData of type:object or type:array. IF
changes were made in it or any sub-keeys, changesMade will be true. If
changesMade is false, then the return result will === the argument.

*/
const expandSeedComputedObjects = <D extends SeedData | InputValue>(data : D, comingFrom : ComingFrom = '') : [result : D | SeedData, changesMade : boolean, isComputedObject : boolean] => {	if (!data || typeof data != 'object') return [data, false, false];

	//It's a seed reference, which is a leaf and fine.
	//TODO: shouldn't I use a more explicit test?
	if ('seed' in data) return [data, false, true];

	//We check for type in data, and not seedData.parse, because if there are
	//nested arrays and objects with seedData in they will fail the seedData
	//parse.
	if ('type' in data) {
		//It's a seedData.
		const seed = data as SeedData;
		const clone = {...seed};

		//The whole point is to add in 'array' and 'object' seeds inbetween
		//where necessary. If we're cloning the inner values for a type that is
		//already of that object, we want to not add an additiona, unncessary
		//indrection.
		let comingFrom : ComingFrom = '';
		if (seed.type == 'array') comingFrom = 'array';
		if (seed.type == 'object') comingFrom = 'object';
		let changesMade = false;
		for (const [key, value] of Object.entries(seed)) {
			//Cheating with casting to InputValue, which makes a type warning go away :shrug:
			const [modifiedValue, localChangesMade] = expandSeedComputedObjects(value as InputValue, comingFrom);
			if (localChangesMade) changesMade = true;
			//eslint-disable-next-line @typescript-eslint/no-explicit-any
			(clone as any)[key] = modifiedValue;
		}
		//Only returnt he clone if at least one property was modified.
		if (changesMade) return [clone, true, true];
		return [data, false, true];
	}
	//It's a generic object or array.
	if (Array.isArray(data)) {
		const clone = [...data] as InputValueArray;
		let changesMade = false;
		let containsComputed = false;
		for (const [i, value] of data.entries()) {
			const [modifiedValue, localChangesMade, localContainsComputed] = expandSeedComputedObjects(value);
			if (localChangesMade) changesMade = true;
			if (localContainsComputed) containsComputed = true;
			clone[i] = modifiedValue as InputValue;
		}
		if (changesMade || containsComputed) {
			//TODO: why do I have to do this  unncessary and incorrect cast to
			//SeedDataArray to get typescript to be satisfied?
			//eslint-disable-next-line @typescript-eslint/no-explicit-any
			if (comingFrom == 'array') return [(clone as any) as SeedDataArray, true, true];
			//We have to wrap ourselves in a type:array so the values will
			//actually be calculated by the engine.
			const result : SeedDataArray = {
				type: 'array',
				items: clone
			};
			return [result, true, true];
		}
		return [data, false, false];
	}

	//it's a generic object.
	const clone = {...data} as InputValueObject;
	let changesMade = false;
	let containsComputed = false;
	for (const [key, value] of TypedObject.entries(data)) {
		const [modifiedValue, localChangesMade, localContainsComputed] = expandSeedComputedObjects(value);
		if (localChangesMade) changesMade = true;
		if (localContainsComputed) containsComputed = true;
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		(clone as any)[key] = modifiedValue;
	}
	if (changesMade || containsComputed) {
		//TODO: why do I have to do this  unncessary and incorrect cast to
		//SeedDataObject to get typescript to be satisfied?
		if (comingFrom == 'object') return [clone as SeedDataObject, true, true];
		//There are computed values somewhere down beneath us so we have to be a type:object
		const result : SeedDataObject = {
			type: 'object',
			properties: clone
		};
		return [result, true, true];
	}
	return [data, false, false];
};

export const expandSeedPacket = (packet : SeedPacket) : ExpandedSeedPacket => {
	const result : ExpandedSeedPacket = {
		version: 0,
		environment: packet.environment || {},
		seeds: {}
	};
	for (let [id, data] of Object.entries(packet.seeds)) {
		[data] = expandSeedComputedObjects(data);
		expandSeedData(id, data, result);
	}
	return result;
};

const collectSeedReferences = (data : ExpandedSeedData) : SeedReference[] => {
	//Should this return an object of key->ref instead?
	const result : SeedReference[] = [];
	for (const value of Object.values(data)) {
		const parsed = seedReference.safeParse(value);
		if(parsed.success) {
			result.push(parsed.data);
		}
	}
	return result;
};

//Will throw an error if an error is found. Will return an array of errors
//representing warnings for less significant problems.
export const verifySeedPacket = (location: SeedPacketAbsoluteLocation, packet : ExpandedSeedPacket) : Error[] | null => {
	const warnings : Error[] = [];
	//First sanity check we typecheck, throwing if not.
	seedPacket.parse(packet);
	for (const [id, data] of TypedObject.entries(packet.seeds)) {
		const refs = collectSeedReferences(data);
		for (const ref of refs) {
			//We don't check external references
			if (ref.packet) continue;
			if (!packet.seeds[ref.seed]) throw new Error(`Seed ${id} referenced a non-existent local seed: ${ref.seed}`);
		}
	}
	if (!packet.environment || !packet.environment.namespace) warnings.push(new Error(`namespace is not set in ${location}. Setting a namespace is recommended`));
	return warnings.length ? warnings : null;
};

export class Seed<D extends ExpandedSeedData = ExpandedSeedData> {

	_garden : Garden;
	_ref : AbsoluteSeedReference;
	_data : D;
	_environmentOverlay : EnvironmentData;

	constructor(garden: Garden, ref : AbsoluteSeedReference, data : D, environmentOverlay? : EnvironmentData) {
		this._garden = garden;
		this._ref = ref;
		this._data = data;
		this._environmentOverlay = environmentOverlay || {};
		if (data.id !== undefined && data.id != ref.seed) throw new Error('ID provided in seed data did not match ID');
	}

	get id() : SeedID {
		return this._ref.seed;
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

	get private() : boolean {
		return this.data.private || false;
	}

	get data() : D {
		return this._data;
	}

	get references() : SeedReference[] {
		const result : SeedReference[] = [];
		for (const value of Object.values(this.data)) {
			const parsedResult = seedReference.safeParse(value);
			if (!parsedResult.success) continue;
			result.push(parsedResult.data);
		}
		return result;
	}

	async grow(env? : Environment) : Promise<Value> {
		if (!env) env = this.garden.environment;
		const subEnv = env.clone(this._environmentOverlay);
		return grow(this, subEnv);
	}
}