import {
	SeedDataType,
	seedData,
	seedDataBase
} from './types.js';

import {
	ZodTypeAny,
	z
} from 'zod';

import {
	assertUnreachable,
	objectShouldBeReference,
	objectShouldBeSeed
} from './util.js';

export const PROPERTY_TYPES = {
	string: true,
	boolean: true,
	number: true,
	null: true,
	array: true,
	object: true,
	seed: true,
	reference: true
} as const;

//TODO: better name
export type PropertyType = keyof (typeof PROPERTY_TYPES);

const SIMPLE_TYPES = {
	'string': true,
	'number': true,
	'boolean': true
} as const;

export const propertyType = (data : unknown) : PropertyType => {
	const typ = typeof data;
	if (typ != 'object') {
		if (typ in SIMPLE_TYPES) return typ as PropertyType;
		throw new Error(`Unexpected type: ${typ}`);
	}
	if (!data) return 'null';
	if (Array.isArray(data)) return 'array';
	if (objectShouldBeReference(data)) return 'reference';
	if (objectShouldBeSeed(data)) return 'seed';
	return 'object';
};

export const changePropertyType = (data : unknown, to : PropertyType) : unknown => {

	switch (to) {
	case 'string':
		return String(data);
	case 'number':
		const parseResult = parseFloat(String(data));
		return isNaN(parseResult) ? 0 : parseResult;
	case 'boolean':
		return Boolean(data);
	case 'null':
		return null;
	case 'object':
		if (!data || typeof data != 'object') return { property: data};
		if (Array.isArray(data)) return Object.fromEntries(data.entries());
		if (objectShouldBeSeed(data)) {
			const result : Record<string, unknown> = {...data};
			delete result['type'];
			return result;
		}
		if (objectShouldBeReference(data)) {
			const result : Record<string, unknown> = {...data};
			delete result['seed'];
			return result;
		}
		return data;
	case 'array':
		return [data];
	case 'reference':
		return {
			seed: ''
		};
	case 'seed':
		return {
			type: 'noop',
			value: data
		};
	default:
		return assertUnreachable(to);
	}

};

type PropertyShape = {
	optional: boolean,
	description: string,
	defaultType: PropertyType
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
	description: '',
	defaultType: 'string'
};

export const EMPTY_SEED_SHAPE : SeedShape = {
	type: 'noop',
	description: '',
	arguments: {},
	options: {}
};

//Exported just for testing
export const extractLeafPropertyTypes = (zShape : z.ZodTypeAny) : Partial<Record<PropertyType, true>> => {

	if (zShape._def.typeName == 'ZodUnion') {
		const items = zShape._def.options.map((inner : ZodTypeAny) => extractLeafPropertyTypes(inner));
		return Object.assign({}, ...items);
	}

	if (zShape._def.typeName == 'ZodOptional') {
		return extractLeafPropertyTypes(zShape._def.innerType);
	}

	if (zShape._def.typeName == 'ZodArray') return {array: true};
	if (zShape._def.typeName == 'ZodRecord') return {object: true};
	//TODO: this is likely actually a SeedReference (that's how function seed_type uses it)
	if (zShape._def.typeName == 'ZodObject') return {object: true};
	if (zShape._def.typeName == 'ZodBoolean') return {boolean: true};
	if (zShape._def.typeName == 'ZodString') return {string: true};
	if (zShape._def.typeName == 'ZodNumber') return {number: true};
	if (zShape._def.typeName == 'ZodNull') return {null: true};
	//TODO: ideally type these more tightly to the actual choices they are allowed
	if (zShape._def.typeName == 'ZodLiteral') return {[propertyType(zShape._def.value)]: true};
	if (zShape._def.typeName == 'ZodEnum') return {[propertyType(zShape._def.values[0])]: true};

	//We have a smoke test in the main test set to verify all seeds run through this without hitting this throw.
	throw new Error('Unknown zShape to process: ' + zShape._def.typeName);
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
		description,
		defaultType: 'string'
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