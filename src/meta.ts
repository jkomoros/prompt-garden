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
	FullyDetailedChoice
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

//NOTE: also update NonEmptyPropertyTypeSet when updating this.
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

type NonEmptyArray<T> = [T, ...T[]];

//TODO: there's got to be a better way to verify that at least one of the keys is set, right?
type NonEmptyPropertyTypeSet = Partial<Record<PropertyType, true>> & (
	{string: true} | {boolean: true} |  {number: true} | {null: true} | {array: true} | {object: true} | {seed: true} | {reference: true}
);

//choice: description
type ChoiceSet = Record<string, string>;

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
		return assertUnreachable(to);
	}

};

/*

TODO (plane):
- moveProperty should also only be a single action, not a DELETE/CHANGE which shows up in undo stack as two items.
- value-editor should render description itself from propShape (maybe?).
- value-editor should get a default value based on propertyShape (which is expecially helfpul for e.g. arrayType.return)
*/

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

export type PropertyShape = {
	optional: boolean,
	description: string,
	allowedTypes: NonEmptyArray<PropertyType>,
	multiLine: boolean,
	choices?: NonEmptyArray<Choice>
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
	allowedTypes: ['string']
};

export const DEFAULT_PROPERTY_SHAPE : PropertyShape = {
	optional: true,
	multiLine: false,
	description: '',
	allowedTypes: TypedObject.keys(PROPERTY_TYPES) as NonEmptyArray<PropertyType>
};

export const EMPTY_SEED_SHAPE : SeedShape = {
	type: 'noop',
	description: '',
	arguments: {},
	options: {}
};

//Exported just for testing
//last return type is multiLine
export const extractLeafPropertyTypes = (zShape : z.ZodTypeAny) : [NonEmptyPropertyTypeSet, ChoiceSet, boolean] => {

	if (zShape._def.typeName == 'ZodUnion') {
		const items = zShape._def.options.map((inner : ZodTypeAny) => extractLeafPropertyTypes(inner)) as [NonEmptyPropertyTypeSet, ChoiceSet, boolean][];
		const typeSets = items.map(item => item[0]) as NonEmptyPropertyTypeSet[];
		const choices = items.map(item => item[1]) as ChoiceSet[];
		const multiLine = items.map(item => item[2]).some(item => item);
		return [Object.assign({}, ...typeSets), Object.assign({}, ...choices), multiLine];
	}

	if (zShape._def.typeName == 'ZodOptional') {
		return extractLeafPropertyTypes(zShape._def.innerType);
	}

	if (zShape._def.typeName == 'ZodEffects') {
		if (zShape._def?.effect?.refinement == MULTI_LINE_SENTINEL) return [{string: true}, {}, true];
		return extractLeafPropertyTypes(zShape._def.schema);
	}

	if (zShape._def.typeName == 'ZodArray') return [{array: true}, {}, false];
	if (zShape._def.typeName == 'ZodRecord') return [{object: true}, {}, false];
	//TODO: this is likely actually a SeedReference (that's how function seed_type uses it)
	if (zShape._def.typeName == 'ZodObject') return [{object: true}, {}, false];
	if (zShape._def.typeName == 'ZodBoolean') return [{boolean: true}, {}, false];
	if (zShape._def.typeName == 'ZodString') return [{string: true}, {}, false];
	if (zShape._def.typeName == 'ZodNumber') return [{number: true}, {}, false];
	if (zShape._def.typeName == 'ZodNull') return [{null: true}, {}, false];
	
	if (zShape._def.typeName == 'ZodLiteral') {
		//Typescript can't tell that we have at least one key set automatically, but it is true by construction.
		const typeSet = {[propertyType(zShape._def.value)]: true} as NonEmptyPropertyTypeSet;
		const choices = {[String(zShape._def.value)]: zShape.description || ''} as Record<string, string>;
		return [typeSet, choices, false];
	}
	if (zShape._def.typeName == 'ZodEnum') {
		//Typescript can't tell that we have at least one key set automatically, but it is true by construction.
		const typeSet = {[propertyType(zShape._def.values[0])]: true} as NonEmptyPropertyTypeSet;
		const choices = Object.fromEntries(zShape._def.values.map((value : unknown) => [String(value), String(value)]));
		return [typeSet, choices, false];
	}

	if (zShape._def.typeName == 'ZodAny') {
		//This happens for example for instanceOf(embedding), inside of a ZodEffects.
		return [{object: true}, {}, false];
	}

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
	const [types, choiceMap, multiLine] = extractLeafPropertyTypes(zShape);
	//Argumetns can always take a seed or a reference.
	const baseTypes = isArgument ? ['seed', 'reference'] : [];
	//The seed/reference should go at the end so they don't become the default.
	const allowedTypes = [...TypedObject.keys(types), ...baseTypes];

	if (allowedTypes.length == 0) throw new Error('Unexpectedly no property types!');

	const choiceArray = TypedObject.entries(choiceMap).map(entry => ({value: entry[0], description: entry[1]}));

	const choices = choiceArray.length == 0 ? undefined : choiceArray as NonEmptyArray<Choice>;

	return {
		optional,
		description,
		multiLine,
		//We verified the length was greater than 1 above.
		allowedTypes: allowedTypes as NonEmptyArray<PropertyType>,
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
		arguments: Object.fromEntries(argumentEntries.map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny, true)])),
		options: Object.fromEntries(optionEntries.map(entry => [entry[0], extractPropertyShape(entry[0], entry[1] as ZodTypeAny, true)])),
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
	choices? : NonEmptyArray<Choice>,
	secret: boolean,
	//Some strings, like key/value are not valid in the top-leavel environment.
	internal: boolean,
	description: string
};

type EnvironmentInfoByKey = Record<string, EnvironmentKeyInfo>;

const parseEnvironmentKeysInfo = () : EnvironmentInfoByKey => {
	const result : EnvironmentInfoByKey = {};
	for (const [key, typ] of TypedObject.entries(knownEnvironmentData.shape)) {

		const shape = extractPropertyShape(key, typ, false);

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

		result[key] = {
			type: shape.allowedTypes[0],
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