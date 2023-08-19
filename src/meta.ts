import {
	SeedDataType,
	seedData,
	seedDataBase
} from './types.js';

import {
	ZodTypeAny,
	z
} from 'zod';

type PropertyShape = {
	optional: boolean,
	description: string
};

//TODO: should these also be in types.ts?
export type SeedShape = {
	type: SeedDataType 
	description: string,
	//Computed sub-objects to change the behavior of the seed. Anything that can
	//be a seedReference.
	arguments: {
		[name : string]: PropertyShape
	},
	//Options on the seed, like id, description, comment, etc.
	options: {
		[name : string]: PropertyShape
	}
};

export const EMPTY_PROPERTY_SHAPE : PropertyShape = {
	optional: true,
	description: ''
};

export const EMPTY_SEED_SHAPE : SeedShape = {
	type: 'noop',
	description: '',
	arguments: {},
	options: {}
};

const extractPropertyShape = (prop : string, zShape : z.ZodTypeAny, isArgument : boolean) : PropertyShape => {

	//NOTE: this depends on shape of output of types.ts:makeNestedSeedData

	if (isArgument) {
		//If it's a seedData property, it's wrapped in a union of [seedData,
		//seedReference, input]. We want to just get input. Note htat some some
		//properties (like call.seed, array.items, and object.items, aren't
		//wrapped in a union and don't need to be unwrapped.
		if (zShape._def.typeName == 'ZodUnion') {
			//0th position is a nested seedData; 1st position is seedReference.
			zShape = zShape._def.options[2];
		}

	}

	const optional = zShape._def.typeName == 'ZodOptional';
	const description = zShape.description || '';

	return {
		optional,
		description
	};
};

const extractSeedShape = (typ : SeedDataType, zShape : z.AnyZodObject) : SeedShape => {
	if (zShape._def.typeName != 'ZodObject') throw new Error('Expected zod object');
	const entries = Object.entries(zShape.shape).filter(entry => entry[0] != 'type');
	const argumentEntries = entries.filter(entry => !(entry[0] in seedDataBase.shape));
	const optionEntries = entries.filter(entry => entry[0] in seedDataBase.shape);
	return {
		type: typ,
		description: zShape.shape.type.description || '',
		arguments: Object.fromEntries(argumentEntries.map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny, true)])),
		options: Object.fromEntries(optionEntries.map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny, true)])),
	};
};

//ZodTypes are really finicky to use for meta-programming, so process them into
//a more direct, purpose built shape that other parts of this package can use
//without getting splinters.

export const SHAPE_BY_SEED : {[typ in SeedDataType]: SeedShape} = Object.fromEntries([...seedData.optionsMap.entries()].map(entry => [entry[0]?.toString(), extractSeedShape(entry[0]?.toString() as SeedDataType, entry[1])]));