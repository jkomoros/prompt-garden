import {
	SeedDataType,
	seedData
} from './types.js';

import {
	ZodTypeAny,
	z
} from 'zod';

type PropertyShape = {
	optional: boolean,
	description: string
};

type SeedShape = {
	type: SeedDataType 
	//TODO: description of seedType
	properties: {
		[name : string]: PropertyShape
	}
};

const extractPropertyShape = (_prop : string, _zShape : z.ZodTypeAny) : PropertyShape => {

	//NOTE: this depends on shape of output of types.ts:makeNestedSeedData

	//TODO: Process the shape of the seedDataProp to extract optional, description, and others.

	return {
		optional: true,
		description: ''
	};
};

const extractSeedShape = (typ : SeedDataType, zShape : z.AnyZodObject) : SeedShape => {
	if (zShape._def.typeName != 'ZodObject') throw new Error('Expected zod object');
	return {
		type: typ,
		properties: Object.fromEntries(Object.entries(zShape.shape).map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny)]))
	};
};

//ZodTypes are really finicky to use for meta-programming, so process them into
//a more direct, purpose built shape that other parts of this package can use
//without getting splinters.

export const SHAPE_BY_SEEED : {[typ in SeedDataType]: SeedShape} = Object.fromEntries([...seedData.optionsMap.entries()].map(entry => [entry[0]?.toString(), extractSeedShape(entry[0]?.toString() as SeedDataType, entry[1])]));