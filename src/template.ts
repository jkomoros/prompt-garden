import {
	z
} from 'zod';

const templateValue = z.union([
	z.string(),
	z.boolean(),
	z.number()
]);

const templateVarRegExp = new RegExp('^[a-zA-Z0-9-_]+$');

const templateVar = z.string().regex(templateVarRegExp);

const templateVarType = z.union([
	z.literal('string'),
	z.literal('int'),
	z.literal('float')
]);

type TemplateVarType = z.infer<typeof templateVarType>;

const VALUE_CONVERTERS : {[t in TemplateVarType]: (input: string) => (number | string)} = {
	'string': (input : string) : string => input,
	'int': (input : string) : number => parseInt(input),
	'float': (input : string) : number => parseFloat(input)
};

const VALUE_PATTERNS : {[t in TemplateVarType]: string} = {
	'string': '.*',
	'int': '-?\\d',
	'float': '-?\\d+(\\.\\d+)?'
};

const templatePartReplacement = z.object({
	var : templateVar,
	default: z.string().optional(),
	optional: z.boolean(),
	type: templateVarType
});

type TemplatePartReplacement = z.infer<typeof templatePartReplacement>;

const templatePart = z.union([
	templatePartReplacement,
	z.string()
]);

type TemplatePart = z.infer<typeof templatePart>;

const templateVars = z.record(templateVar, templateValue);

type TemplateVars =z.infer<typeof templateVars>;

//If you change any of these, update the tests in template that test for those
//values being handled fine.
const REPLACEMENT_START = '{{';
const REPLACEMENT_END = '}}';
const VARIABLE_MODIFIER_DELIMITER = '|';
const VARIABLE_MODIFIER_INNER_DELIMITER = ':';

//Expects an input like `'abc'` or `"abc"`.
const extractString = (input : string) : string => {
	if (!input.startsWith('\'') && !input.startsWith('"')) throw new Error('Argument must be wrapped in quotes');
	const singleQuote = input.startsWith('\'');
	if (singleQuote && !input.endsWith('\'')) throw new Error('String started with \' but did not end with it');
	if (!singleQuote && !input.endsWith('"')) throw new Error('String started with " but did not end with it');
	const inner = input.substring(1, input.length - 1);
	//eslint-disable-next-line quotes
	return singleQuote ? inner.split("\\'").join("'") : inner.split('\\"').join('"');
};

const parseTemplatePartReplacement = (innerPattern : string) : TemplatePartReplacement =>  {
	innerPattern = innerPattern.trim();
	let [firstPart, rest] = extractUpToQuote(innerPattern, VARIABLE_MODIFIER_DELIMITER);
	firstPart = firstPart.trim();
	if (!templateVar.safeParse(firstPart).success) throw new Error('Template vars must use numbers, letters dashes and underscores only');
	const result : TemplatePartReplacement = {
		var: firstPart,
		optional: false,
		type: 'string'
	};
	let command = '';
	while (rest.length) {
		[command, rest] = extractUpToQuote(rest, VARIABLE_MODIFIER_DELIMITER);
		const modifierType = command.includes(VARIABLE_MODIFIER_INNER_DELIMITER) ? command.substring(0, command.indexOf(VARIABLE_MODIFIER_INNER_DELIMITER)) : command;
		const modifierArg = command.includes(VARIABLE_MODIFIER_INNER_DELIMITER) ? command.substring(command.indexOf(VARIABLE_MODIFIER_INNER_DELIMITER) + VARIABLE_MODIFIER_INNER_DELIMITER.length).trim() : '';
		switch (modifierType.trim()) {
		case 'default':
			if (!modifierArg) throw new Error('The default modifier expects a string argument');
			result.default = extractString(modifierArg);
			break;
		case 'optional':
			if (modifierArg) throw new Error('optional does not expect an argument');
			result.optional = true;
			break;
		case 'int':
			if (modifierArg) throw new Error('int does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			result.type = 'int';
			break;
		case 'float':
			if (modifierArg) throw new Error('float does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			result.type = 'float';
			break;
		default:
			throw new Error(`Unknown modifier: ${modifierType}`);
		}
	}
	return result;
};

const extractUpTo = (input : string, pattern : string) : [prefix : string, rest : string] => {
	if (!input.includes(pattern)) return [input, ''];
	const index = input.indexOf(pattern);
	if (index == 0) {
		return ['', input.substring(pattern.length)];
	}
	return [input.substring(0, index), input.substring(index + pattern.length)];
};

//Like extractUpTo, but ignores pattern if it occurs within a string.
const extractUpToQuote = (input : string, pattern : string) : [prefix : string, rest : string] => {
	let result = '';
	let index = 0;
	let withinString = false;
	let singleQuote = false;
	let char = '';
	let lastChar = '';
	while (index < input.length) {
		lastChar = char;
		char = input.substring(index, index + 1);
		result += char;
		index++;
		//Should we enter or exit string mode?
		if (withinString) {
			//Check if it's the type of quote that we've started and it wasn't escaped.
			if (char == '\'' && singleQuote && lastChar != '\\') withinString = false;
			if (char == '"' && !singleQuote && lastChar != '\\') withinString = false;
		} else {
			//TODO: support double quote
			if (char == '\'') {
				withinString = true;
				singleQuote = true;
			}
			if (char == '"') {
				withinString = true;
				singleQuote = false;
			}
		}
		//Ignore further processing if we're in string mode
		if (withinString) continue;
		const rest = input.substring(index);
		if (rest.startsWith(pattern)) {
			//Found it
			return [result, rest.substring(pattern.length)];
		}
	}
	return [result, ''];
};

const parseTemplate = (pattern : string) : TemplatePart[] => {
	let rest = pattern;
	let prefix = '';
	let command = '';
	const result : TemplatePart[] = [];
	while (rest.length) {
		[prefix, rest] = extractUpTo(rest, REPLACEMENT_START);
		if (prefix.includes(REPLACEMENT_END)) throw new Error(`There was a missing ${REPLACEMENT_START}`);
		if (prefix) result.push(prefix);
		if (!rest) return result;
		[command, rest] = extractUpToQuote(rest, REPLACEMENT_END);
		//TODO: if command includes a {{ not in a string, throw an error about an extra '{{'
		//Example test: 'Hello, {{name it\'s {{day}}'
		if (!command) throw new Error(`A ${REPLACEMENT_START} was missing a ${REPLACEMENT_END}`);
		result.push(parseTemplatePartReplacement(command));
	}
	return result;
};

const escapeRegExp = (input : string) : string => {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export class Template {

	_pieces : TemplatePart[];
	_extract : RegExp | undefined;
	
	constructor(pattern : string) {
		this._pieces = parseTemplate(pattern);
	}

	render(vars : TemplateVars): string {
		return this._pieces.map(piece => {
			if (typeof piece == 'string') return piece;
			//It's a replacement.
			if (vars[piece.var] === undefined) {
				if (piece.default === undefined) throw new Error(`Template had a placeholder for ${piece.var} but it did not exist in vars and no default was provided.`);
				return piece.default;
			}
			return String(vars[piece.var]);
		}).join('');
	}

	_ensureExtract() {
		if (this._extract) return;
		let patternString = '^';
		for (const piece of this._pieces) {
			if (typeof piece == 'string') {
				//We want to take literal strings as literal matches, which requires escaping special characters.
				patternString += escapeRegExp(piece);
				continue;
			}
			patternString += '(' + VALUE_PATTERNS[piece.type] + ')';
			
			if (piece.optional) patternString += '?';
		}
		patternString += '$';
		this._extract = new RegExp(patternString);
	}

	extract(input : string) : TemplateVars {
		this._ensureExtract();
		const matches = input.match(this._extract as RegExp);
		if (!matches) throw new Error('No matches');
		const vars = this._pieces.filter(piece => typeof piece != 'string') as TemplatePartReplacement[];
		const result : TemplateVars = this.default();
		for (const [i, v] of vars.entries()) {
			const match = matches[i + 1];
			//If it had a default, it was already set at result initalization,
			//and if it doesn't we're supposed to skip anyway.
			if (match == undefined) continue;
			const converter = VALUE_CONVERTERS[v.type];
			result[v.var] = converter(match);
		}
		return result;
	}

	//Returns a map of name -> defaultValue for any template vars that have a
	//default value set, skipping ones that don't.
	default() : TemplateVars {
		const result : TemplateVars = {};
		for (const piece of this._pieces) {
			if (typeof piece == 'string') continue;
			if (piece.default == undefined) continue;
			const converter = VALUE_CONVERTERS[piece.type];
			result[piece.var] = converter(piece.default);
		}
		return result;
	}
}