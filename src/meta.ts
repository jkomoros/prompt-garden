import {
	JSON,
	MULTI_LINE_SENTINEL,
	SeedDataIsh,
	SeedDataType,
	SeedDataTypes,
	knownEnvironmentArgumentKey,
	knownEnvironmentData,
	knownEnvironmentProtectedKey,
	knownEnvironmentSecretKey,
	seedData,
	seedDataBase,
	Choice,
	FullyDetailedChoice,
	PropertyType,
	SeedShape,
	PropertyShape,
	NonEmptyArray,
	TypeShape,
	SIMPLE_PROPERTY_TYPES,
	TypeShapeSimple,
	SeedData,
	SeedReference,
	inputValue,
	value
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

import {
	TypedObject
} from './typed-object.js';

import {
	FALSE_LITERALS,
	TRUE_LITERALS
} from './template.js';

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

export const changePropertyType = (data : unknown, to : PropertyType | TypeShape) : unknown => {

	const shape = typeof to == 'string' ? {type: to} : to;

	const shapeType = shape.type;

	switch (shapeType) {
	case 'unknown':
		//it's allowed to be any shape
		return data;
	case 'string':
		return String(data);
	case 'number':
		const parseResult = parseFloat(String(data));
		return isNaN(parseResult) ? 0 : parseResult;
	case 'boolean':
		if (typeof data == 'string') {
			const lower = data.toLowerCase();
			if (lower in TRUE_LITERALS) return true;
			if (lower in FALSE_LITERALS) return false;
		}
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
		return assertUnreachable(shapeType);
	}

};

export const choicesAsStrings = (choices? : Choice[]) : string[] => {
	if (!choices) return [];
	return choices.map(choice => {
		if (typeof choice == 'string') return choice;
		return choice.value;
	});
};

export const makeChoicesFullyDetailed = (choices? : Choice[]) : FullyDetailedChoice[] => {
	if (!choices) return [];
	return choices.map(rawChoice => {
		if (typeof rawChoice == 'string') rawChoice = {value: rawChoice};
		const result = {...rawChoice};
		if (result.display === undefined) result.display = result.value;
		if (result.description === undefined) result.description = result.display || result.value;
		return result as FullyDetailedChoice;
	});
};

//Often you want to iterate through arguments and options together, so this
//convenience method makes that easier.
export const argumentsAndOptions = (shape : SeedShape) : Record<string, PropertyShape> => {
	return {
		...shape.arguments,
		...shape.options
	};
};

export const EMPTY_PROPERTY_SHAPE : PropertyShape = {
	optional: true,
	multiLine: false,
	description: '',
	allowedTypes: [{type: 'string'}]
};

export const DEFAULT_PROPERTY_SHAPE : PropertyShape = {
	optional: true,
	multiLine: false,
	description: '',
	allowedTypes: [{type: 'unknown'}]
};

export const EMPTY_SEED_SHAPE : SeedShape = {
	type: 'noop',
	description: '',
	arguments: {},
	options: {}
};

const shapeIsSeedData = (zShape : z.ZodTypeAny) : boolean => {
	const seedExample : SeedData = {
		type: 'log',
		value: 'foo'
	};
	return zShape.safeParse(seedExample).success;
};

const shapeIsSeedReference = (zShape : z.ZodTypeAny) : boolean => {
	const refExample : SeedReference = {
		seed: 'foo'
	};
	return zShape.safeParse(refExample).success;
};

//Exported just for testing
//last return type is multiLine
export const extractLeafPropertyTypes = (zShape : z.ZodTypeAny) : PropertyShape => {

	const description = zShape.description || '';

	const result : PropertyShape = {
		description,
		multiLine: false,
		optional: false,
		allowedTypes: [{type: 'unknown'}]
	};

	if (zShape == inputValue || zShape == value) {
		//avoid infinite recursion, since inputValue and value recurse.
		return result;
	}

	if (zShape._def.typeName == 'ZodLazy') {
		return extractLeafPropertyTypes(zShape._def.getter());
	}

	if (zShape._def.typeName == 'ZodDiscriminatedUnion') {
		if (!shapeIsSeedData(zShape)) throw new Error('Unexpected discriminated union');
		return {
			...result,
			allowedTypes: [{type: 'seed'}]
		};
	}

	if (zShape._def.typeName == 'ZodUnion') {
		const items = zShape._def.options.map((inner : ZodTypeAny) => extractLeafPropertyTypes(inner)) as PropertyShape[];
		return {
			optional: items.some(item => item.optional),
			description: description || items.map(item => item.description).find(description => description != '') || '',
			multiLine: items.some(item => item.multiLine),
			allowedTypes: items.map(item => item.allowedTypes).flat() as NonEmptyArray<TypeShape>,
			choices: items.map(item => item.choices || []).flat()
		};
	}

	if (zShape._def.typeName == 'ZodOptional') {
		const inner = extractLeafPropertyTypes(zShape._def.innerType);
		return {
			...inner,
			description: description || inner.description,
			optional: true
		};
	}

	if (zShape._def.typeName == 'ZodEffects') {
		if (zShape._def?.effect?.refinement == MULTI_LINE_SENTINEL) {
			return {
				...result,
				allowedTypes: [{type: 'string'}],
				multiLine: true
			};
		}
		return extractLeafPropertyTypes(zShape._def.schema);
	}

	if (zShape._def.typeName == 'ZodArray') {
		return {
			...result,
			allowedTypes: [{
				type: 'array',
				innerShape: extractLeafPropertyTypes(zShape._def.type)
			}]
		};
	}
	if (zShape._def.typeName == 'ZodRecord') {
		return {
			...result,
			allowedTypes: [{
				type: 'object',
				innerShape: extractLeafPropertyTypes(zShape._def.valueType)
			}]
		};
	}
	if (zShape._def.typeName == 'ZodObject') {
		if (shapeIsSeedReference(zShape)) {
			return {
				...result,
				allowedTypes: [{type: 'reference'}]
			};
		}
		//TODO: in the future when it's possible to have different types for
		//different properties, return them here.
		//TODO: return the catchall if it exists.
		return {
			...result,
			allowedTypes: [defaultTypeShapeForPropertyType('object')]
		};
	}
	if (zShape._def.typeName == 'ZodBoolean') {
		return {
			...result,
			allowedTypes: [{type: 'boolean'}]
		};
	}
	if (zShape._def.typeName == 'ZodString') {
		return {
			...result,
			allowedTypes: [{type: 'string'}]
		};
	}
	if (zShape._def.typeName == 'ZodNumber') {
		return {
			...result,
			allowedTypes: [{type: 'number'}]
		};
	}
	if (zShape._def.typeName == 'ZodNull') {
		return {
			...result,
			allowedTypes: [{type: 'null'}]
		};
	}
	
	if (zShape._def.typeName == 'ZodLiteral') {
		return {
			...result,
			allowedTypes: [defaultTypeShapeForPropertyType(propertyType(zShape._def.value))],
			choices: [{
				value: String(zShape._def.value),
				description
			}]
		};
	}
	if (zShape._def.typeName == 'ZodEnum') {
		return {
			...result,
			allowedTypes: [defaultTypeShapeForPropertyType(propertyType(zShape._def.values[0]))],
			choices: zShape._def.values.map((value : unknown) => ({value: String(value), description: String(value)}))
		};
	}

	if (zShape._def.typeName == 'ZodAny') {
		//This happens for example for instanceOf(embedding), inside of a ZodEffects.
		return {
			...result,
			allowedTypes: [defaultTypeShapeForPropertyType('object')]
		};
	}

	//We have a smoke test in the main test set to verify all seeds run through this without hitting this throw.
	throw new Error('Unknown zShape to process: ' + zShape._def.typeName);
};

const defaultTypeShapeForPropertyType = (property : PropertyType) : TypeShape => {
	if (property == 'array' || property == 'object') {
		const innerShape = {...DEFAULT_PROPERTY_SHAPE};
		innerShape.allowedTypes = [{type: 'unknown'}];
		return {
			type: property,
			innerShape
		};
	}
	return {type: property};
};

const typeShapeIsSimple = (shape : TypeShape) : shape is TypeShapeSimple => {
	return shape.type in SIMPLE_PROPERTY_TYPES || shape.type == 'unknown';
};

//Produces a cannoical identifier for a given type shape. Two shapes that have
//the same identifier are equivalent and vice versa.
const identifierForTypeShape = (shape : TypeShape) : string => {
	if (typeShapeIsSimple(shape)) return shape.type;
	return shape.type + ':' + shape.innerShape.allowedTypes.map(typ => identifierForTypeShape(typ)).join(',');
};

//Returns true if the two typeShapes are compatible.
export const typeShapeCompatible = (a : TypeShape | PropertyType, b : TypeShape | PropertyType) : boolean => {
	const aShape = typeof a == 'string' ? defaultTypeShapeForPropertyType(a) : a;
	const bShape = typeof b == 'string' ? defaultTypeShapeForPropertyType(b) : b;

	//unknown matches anything on the other side.
	if (aShape.type == 'unknown' || bShape.type == 'unknown') return true;

	//Even if aShape or bShape are not simple, if they are different types they
	//don't match.
	if (aShape.type != bShape.type) return false;

	//Simple types just have to match directly
	if (typeShapeIsSimple(aShape)) return aShape.type == bShape.type;
	//We already checked that aShape and bShape are the same type; we're just
	//making sure TypeScript is clued in about that too.
	if (typeShapeIsSimple(bShape)) throw new Error('bShape unexpectedly not simple');

	//TODO: once non-record style objects (that is, with specific properties)
	//are supported, objects might need to be treated specially.

	//The two types are compatible if at least one item in allowedTypes for subType overlaps.
	for (const subAAllowedType of aShape.innerShape.allowedTypes) {
		for (const subBAllowedType of bShape.innerShape.allowedTypes) {
			if (typeShapeCompatible(subAAllowedType, subBAllowedType)) return true;
		}
	}
	return false;
};

const uniqueAllowedTypes = (input : TypeShape[]) : NonEmptyArray<TypeShape> => {
	const result : TypeShape[] = [];
	//Meta options like seed and reference need to go at the end, so non-seed
	//options are at the beginning as defaults.
	const resultSuffix : TypeShape[] = [];
	const includedItems : Record<string, true> = {};
	for (const item of input) {
		const identifier = identifierForTypeShape(item);
		if (includedItems[identifier]) continue;
		includedItems[identifier] = true;
		if (item.type == 'seed' || item.type == 'reference') {
			resultSuffix.push(item);
		} else {
			result.push(item);
		}
	}

	const finalResult = [...result, ...resultSuffix];

	if (finalResult.length == 0) throw new Error('Unexpectedly no property types!');

	return finalResult as NonEmptyArray<TypeShape>;

};

const extractPropertyShape = (prop : string, zShape : z.ZodTypeAny) : PropertyShape => {

	const shape = extractLeafPropertyTypes(zShape);
	const allowedTypes = uniqueAllowedTypes(shape.allowedTypes);

	const rawChoices = shape.choices || [];
	const choices = rawChoices.length == 0 ? undefined : rawChoices as NonEmptyArray<Choice>;

	return {
		...shape,
		allowedTypes,
		choices
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
		arguments: Object.fromEntries(argumentEntries.map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny)])),
		options: Object.fromEntries(optionEntries.map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny)])),
	};
};

//changeSeedType returns a copy of data where newType has been modified. In
//particular, it will ensure htat default values for the required properties are
//not empty (setting them with defaults if they don't exist). Note that the
//return result is like a SeedData but is technically not one because it might
//have extra properties, that's why it's technically an unknown.
export const changeSeedType = (data : SeedDataIsh, newType : SeedDataType) : SeedDataIsh => {
	//TODO: add a removeExtra flag
	const result : SeedDataIsh = {
		...data,
		type: newType
	};
	const shape = SHAPE_BY_SEED[newType];
	for (const [name, argument] of TypedObject.entries(argumentsAndOptions(shape))) {
		if (argument.optional) continue;
		if (name in result) continue;
		const newValue = changePropertyType('', argument.allowedTypes[0]);
		result[name] = newValue as JSON;
	}
	return result;
};

//ZodTypes are really finicky to use for meta-programming, so process them into
//a more direct, purpose built shape that other parts of this package can use
//without getting splinters.

export const SHAPE_BY_SEED : {[typ in SeedDataType]: SeedShape} = Object.fromEntries([...seedData.optionsMap.entries()].map(entry => [entry[0]?.toString(), extractSeedShape(entry[0]?.toString() as SeedDataType, entry[1])]));

export const shapeForSeed = (data? : SeedDataIsh) : SeedShape => {
	if (!data) return EMPTY_SEED_SHAPE;
	if (!SeedDataTypes.some(typ => typ == data.type)) return EMPTY_SEED_SHAPE;
	const shape = SHAPE_BY_SEED[data.type as SeedDataType];
	if (!shape) return EMPTY_SEED_SHAPE;
	return shape;
};

type EnvironmentKeyInfo = {
	type: PropertyType,
	choices? : Choice[],
	secret: boolean,
	//Some strings, like key/value are not valid in the top-leavel environment.
	internal: boolean,
	description: string
};

type EnvironmentInfoByKey = Record<string, EnvironmentKeyInfo>;

const parseEnvironmentKeysInfo = () : EnvironmentInfoByKey => {
	const result : EnvironmentInfoByKey = {};
	for (const [key, typ] of TypedObject.entries(knownEnvironmentData.shape)) {

		const shape = extractPropertyShape(key, typ);

		let secret = false;
		let internal = false;

		const description = shape.description;

		//Check to see if it's any type that's not string
		if (key in knownEnvironmentSecretKey.enum) {
			secret = true;
		}
		if (key in knownEnvironmentProtectedKey.enum) {
			secret = true;
		}
		if (key in knownEnvironmentArgumentKey.enum) {
			internal = true;
		}

		let t = shape.allowedTypes[0].type;

		//The one case unknown shows up is for value, which shouln't be set in
		//the UI anyway so just pretend like it's a string. Although maybe the
		//right thing to do is to actually allow unknown here?
		if (t == 'unknown') t = 'object';

		result[key] = {
			type: t,
			choices: shape.choices,
			secret,
			internal,
			description
		};
	}
	return result;
};

const ENVIRONMENT_KEYS_INFO = parseEnvironmentKeysInfo();

export const getInfoForEnvironmentKey = (key : string) : EnvironmentKeyInfo => {
	const info = ENVIRONMENT_KEYS_INFO[key];
	if (!info) return {
		type: 'string',
		internal: false,
		secret: false,
		description: `${key} is not a known environment key`
	};
	return info;
};