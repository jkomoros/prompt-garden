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
	//Whether the property accepts a seedReference / nested seedData.
	computed: boolean,
	description: string
};

type SeedShape = {
	type: SeedDataType 
	description: string,
	properties: {
		[name : string]: PropertyShape
	}
};

const extractPropertyShape = (prop : string, zShape : z.ZodTypeAny) : PropertyShape => {

	//NOTE: this depends on shape of output of types.ts:makeNestedSeedData

	let computed = false;
	
	if (!(prop in seedDataBase.shape)) {
		//If it's a seedData property, it's wrapped in a union of [seedData, seedReference, input]. We want to just get input.
		if (zShape._def.typeName == 'ZodUnion') {
			//0th position is a nested seedData; 1st position is seedReference.
			zShape = zShape._def.options[2];
		}
		//Note htat some some properties (like call.seed, array.items, and object.items, aren't wrapped in a union)
		computed = true;
	}


	const optional = zShape._def.typeName == 'ZodOptional';
	const description = zShape.description || '';

	return {
		optional,
		description,
		computed
	};
};

const extractSeedShape = (typ : SeedDataType, zShape : z.AnyZodObject) : SeedShape => {
	if (zShape._def.typeName != 'ZodObject') throw new Error('Expected zod object');
	return {
		type: typ,
		description: zShape.shape.type.description || '',
		properties: Object.fromEntries(Object.entries(zShape.shape).filter(entry => entry[0] != 'type').map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny)]))
	};
};

//ZodTypes are really finicky to use for meta-programming, so process them into
//a more direct, purpose built shape that other parts of this package can use
//without getting splinters.

export const SHAPE_BY_SEED : {[typ in SeedDataType]: SeedShape} = Object.fromEntries([...seedData.optionsMap.entries()].map(entry => [entry[0]?.toString(), extractSeedShape(entry[0]?.toString() as SeedDataType, entry[1])]));