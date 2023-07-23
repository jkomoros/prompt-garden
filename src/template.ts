import {
	z
} from 'zod';

import {
	assertUnreachable, getObjectProperty, setObjectProperty
} from './util.js';

//Unknown is a stand-in for JSON-style output
type TemplateValueLeaf = string | boolean | number | unknown;

type TemplateValueArray = TemplateVars[];

type TemplateValue = TemplateValueArray | TemplateValueLeaf;

const templateVarRegExp = new RegExp('^[a-zA-Z0-9-_.]+$');

const templateVar = z.string().regex(templateVarRegExp);

type TemplateVar = z.infer<typeof templateVar>;

const templateVarType = z.union([
	z.literal('string'),
	z.literal('int'),
	z.literal('float'),
	z.literal('boolean'),
	z.literal('whitespace'),
	z.literal('json')
]);

type TemplateVarType = z.infer<typeof templateVarType>;

const TRUE_LITERALS : {[literal : string] : true} = {
	'true': true,
	't': true,
	'1': true,
	'yes': true,
	'y': true
};

const FALSE_LITERALS : {[literal : string] : true} = {
	'false': true,
	'f': true,
	'0': true,
	'no': true,
	'n': true
};

const VALUE_EXTRACTORS : {[t in TemplateVarType]: (input: string) => (number | string | boolean)} = {
	'string': (input : string) : string => input,
	'int': (input : string) : number => parseInt(input),
	'float': (input : string) : number => parseFloat(input),
	'boolean': (input : string) : boolean => {
		input = input.toLowerCase().trim();
		if (TRUE_LITERALS[input]) return true;
		if (FALSE_LITERALS[input]) return false;
		return Boolean(input);
	},
	'whitespace': () => '',
	'json': (input) => JSON.parse(input)
};

const VALUE_CONVERTERS : {[t in TemplateVarType]: (input: unknown) => string} = {
	'string': String,
	'int': String,
	'float': String,
	'boolean': String,
	'whitespace': String,
	'json': (input) => JSON.stringify(input, null, '\t')
};

const VALUE_PATTERNS : {[t in TemplateVarType]: string} = {
	'string': '.*?',
	'int': '-?\\d+?',
	'float': '-?\\d+?(\\.\\d+?)?',
	'boolean': [...Object.keys(TRUE_LITERALS), ...Object.keys(FALSE_LITERALS)].join('|'),
	'whitespace': '\\s+',
	'json': '\\{([^}]*)\\}'
};

//templates with a var of IGNORE_VAR should be ignored for rendering and
//extracting, just drop the value on the floor.
const IGNORE_VAR = '_';

type TemplatePartReplacement = {
	var: TemplateVar,
	default? : string;
	optional: boolean;
	type: TemplateVarType,
	loop?: TemplatePart[];
	choices? : {[name : string] : true};
	//A regex to use
	pattern? : string;
};

type TemplatePart = string | TemplatePartReplacement;

type TemplateVars = {[v : TemplateVar]: TemplateValue};

//If you change any of these, update the tests in template that test for those
//values being handled fine.
const REPLACEMENT_START = '{{';
const REPLACEMENT_END = '}}';
const VARIABLE_MODIFIER_DELIMITER = '|';
const VARIABLE_MODIFIER_INNER_DELIMITER = ':';
//What things like @loop and @end start with
const CONTROL_CHARACTER = '@';

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

type TemplatePartControlType = '' | 'loop' | 'end';

const ALLOWED_CONTROL_COMMANDS : {[command in TemplatePartControlType]: boolean } = {
	'': false,
	'loop': true,
	'end': true
};

const extractControlPart = (innerPattern : string) : [typ : TemplatePartControlType, rest : string] => {
	innerPattern = innerPattern.trim();
	if (!innerPattern.startsWith(CONTROL_CHARACTER)) return ['', innerPattern];
	const [command, rest] = extractUpToQuote(innerPattern, VARIABLE_MODIFIER_INNER_DELIMITER);
	const trimmedCommand = command.slice(CONTROL_CHARACTER.length) as TemplatePartControlType;
	if (!ALLOWED_CONTROL_COMMANDS[trimmedCommand]) throw new Error(`Unknown control command: ${trimmedCommand}`);
	return [trimmedCommand, rest];
};

const GREEDY_QUANTIFIER_REGEXP = /[+*]{1}([^?]|$)/;

const patternHasGreedyQuantifiers = (input : string) : boolean => {
	return GREEDY_QUANTIFIER_REGEXP.test(input);
};

//The first part of return will only be null if the ControlType is 'end'.
const parseTemplatePartReplacement = (innerPattern : string) : [TemplatePartReplacement | null, TemplatePartControlType] =>  {
	innerPattern = innerPattern.trim();
	const [controlCommand, firstRest] = extractControlPart(innerPattern);
	let isStartLoop = false;
	if (controlCommand) {
		switch (controlCommand){
		case 'loop':
			isStartLoop = true;
			break;
		case 'end':
			if (firstRest.trim()) throw new Error(`@end must not have modifiers, but had ${firstRest}`);
			return [null, 'end'];
		default:
			assertUnreachable(controlCommand);
		}
	}
	//If it's a loop start we wnat to go up to :, if it's not we want to go up to |
	let [firstPart, rest] = extractUpToQuote(firstRest, isStartLoop ? VARIABLE_MODIFIER_INNER_DELIMITER : VARIABLE_MODIFIER_DELIMITER);
	firstPart = firstPart.trim();
	if (!templateVar.safeParse(firstPart).success) throw new Error('Template vars must use numbers, letters dashes and underscores only');
	const result : TemplatePartReplacement = {
		var: firstPart,
		optional: false,
		type: 'string'
	};
	if (isStartLoop) {
		result.loop = [];
	}
	let command = '';
	while (rest.length) {
		[command, rest] = extractUpToQuote(rest, VARIABLE_MODIFIER_DELIMITER);
		const modifierType = command.includes(VARIABLE_MODIFIER_INNER_DELIMITER) ? command.substring(0, command.indexOf(VARIABLE_MODIFIER_INNER_DELIMITER)) : command;
		const modifierArg = command.includes(VARIABLE_MODIFIER_INNER_DELIMITER) ? command.substring(command.indexOf(VARIABLE_MODIFIER_INNER_DELIMITER) + VARIABLE_MODIFIER_INNER_DELIMITER.length).trim() : '';
		if (isStartLoop) {
			throw new Error(`@loop command got modifier ${modifierType} but no modifiers are legal in that context`);
		}
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
			if (result.choices) throw new Error('Choices already set so int is not legal');
			if (result.pattern) throw new Error('A pattern is already set');
			result.type = 'int';
			break;
		case 'float':
			if (modifierArg) throw new Error('float does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			if (result.choices) throw new Error('Choices already set so float is not legal');
			if (result.pattern) throw new Error('A pattern is already set');
			result.type = 'float';
			break;
		case 'boolean':
			if (modifierArg) throw new Error('boolean does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			if (result.choices) throw new Error('Choices already set so boolean is not legal');
			if (result.pattern) throw new Error('A pattern is already set');
			result.type = 'boolean';
			break;
		case 'whitespace':
			if (modifierArg) throw new Error('whitespace does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			if (result.choices) throw new Error('Choices already set so whitespace is not legal');
			if (result.pattern) throw new Error('A pattern is already set');
			result.type = 'whitespace';
			break;
		case 'json':
			if (modifierArg) throw new Error('json does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			if (result.choices) throw new Error('Choices already set so json is not legal');
			if (result.pattern) throw new Error('A pattern is already set');
			result.type = 'json';
			break;
		case 'choice':
			if (!modifierArg) throw new Error('choice expects one argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			if (result.pattern) throw new Error('A pattern is already set');
			if (!result.choices) result.choices = {};
			result.choices[extractString(modifierArg)] = true;
			break;
		case 'pattern':
			if (!modifierArg) throw new Error('pattern expects one argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			if (result.choices) throw new Error('Choices already set for this variable');
			//TODO: replace any quantifiers with their non-greedy version, or throw if they don't have them.
			const pattern = extractString(modifierArg);
			if (patternHasGreedyQuantifiers(pattern)) throw new Error('Pattern must use non-greedy quantifiers (e.g. `*?`)');
			result.pattern = pattern;
			break;
		default:
			throw new Error(`Unknown modifier: ${modifierType}`);
		}
	}
	return [result, isStartLoop ? 'loop' : ''];
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

//This is just a utility function for parseTemplate. In many cases we want to
//add a next piece to either the currently active last loop piece, or to the
//overall result. The logic is duplicated three times and just to make
//parseTemplate clearer, factor it out here.
const addToLoopsOrResult = (part : TemplatePart, loops : TemplatePartReplacement[], result: TemplatePart[]) : void => {
	if (loops.length) {
		const firstLoop = loops[0];
		if (!firstLoop.loop) throw new Error('partial loop item unexpectedly had no loop array');
		firstLoop.loop.push(part);
		return;
	}
	result.push(part);
};

const validateTemplate = (pieces : TemplatePart[]) : void => {
	for (const piece of pieces) {
		if (typeof piece == 'string') continue;
		if (piece.choices) {
			if (piece.default) {
				if (!piece.choices[piece.default]) throw new Error(`Template part ${piece.var} was limited to choices but its default was not one of them`);
			}
		}
		if (piece.loop) validateTemplate(piece.loop);
	}
};

const parseTemplate = (pattern : string) : TemplatePart[] => {
	let rest = pattern;
	let prefix = '';
	let command = '';
	const result : TemplatePart[] = [];
	//The current loop construct we're in, as a FIFO stack.
	const loops : TemplatePartReplacement[] = [];
	while (rest.length) {
		[prefix, rest] = extractUpTo(rest, REPLACEMENT_START);
		if (prefix.includes(REPLACEMENT_END)) throw new Error(`There was a missing ${REPLACEMENT_START}`);
		if (prefix) {
			addToLoopsOrResult(prefix, loops, result);
		}
		if (!rest) return result;
		[command, rest] = extractUpToQuote(rest, REPLACEMENT_END);
		//TODO: if command includes a {{ not in a string, throw an error about an extra '{{'
		//Example test: 'Hello, {{name it\'s {{day}}'
		if (!command) throw new Error(`A ${REPLACEMENT_START} was missing a ${REPLACEMENT_END}`);
		const [part, controlType] = parseTemplatePartReplacement(command);
		switch (controlType) {
		case '':
			if (!part) throw new Error('Template part unexpectedly null');
			addToLoopsOrResult(part, loops, result);
			break;
		case 'loop':
			if (!part) throw new Error('Template part unexpectedly null');
			loops.unshift(part);
			break;
		case 'end':
			const piece = loops.shift();
			if (!piece) throw new Error('end command found but not in a loop context');
			addToLoopsOrResult(piece, loops, result);
			break;
		default:
			assertUnreachable(controlType);
		}
	}
	if (loops.length) throw new Error('Unterminated loops remained at end of parsing');
	validateTemplate(result);
	return result;
};

const escapeRegExp = (input : string) : string => {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const renderTemplatePiece = (piece : TemplatePart, vars : TemplateVars) : string => {
	if (typeof piece == 'string') return piece;
	if (piece.var == IGNORE_VAR) return '';
	//It's a replacement.
	const v = getObjectProperty(vars, piece.var);
	if (v === undefined) {
		if (piece.default === undefined) throw new Error(`Template had a placeholder for ${piece.var} but it did not exist in vars and no default was provided.`);
		return piece.default;
	}
	//Assign to a variable so typescript notes it's not undefined
	const loop = piece.loop;
	if (loop) {
		if (!Array.isArray(v)) throw new Error(`${piece.var} was a loop context but the vars did not pass an array`);
		return v.map(subVars => renderTemplatePieces(loop, subVars)).join('');
	}
	const str = VALUE_CONVERTERS[piece.type](v);
	if (piece.choices) {
		if (!piece.choices[str]) throw new Error(`${str} was not one of the choices for ${piece.var}`);
	}
	return str;
};

const renderTemplatePieces = (pieces : TemplatePart[], vars : TemplateVars) : string => {
	return pieces.map(piece => renderTemplatePiece(piece, vars)).join('');
};

const defaultForPieces = (pieces : TemplatePart[]) : TemplateVars => {
	const result : TemplateVars = {};
	for (const piece of pieces) {
		if (typeof piece == 'string') continue;
		//Loops don't have defaults so they won't get filled in. We'll fill them
		//in later.
		if (piece.default == undefined) continue;
		const converter = VALUE_EXTRACTORS[piece.type];
		setObjectProperty(result, piece.var, converter(piece.default));
	}
	return result;
};

const subPatternForLoopPiece = (piece : TemplatePartReplacement, subordinate : boolean) : string => {
	if (piece.loop) {
		return '(' + (subordinate ? '?:' : '') + regExForTemplate(piece.loop, true, true).source + ')*';
	}
	if (piece.choices) {
		return Object.keys(piece.choices).map(key => escapeRegExp(key)).join('|');
	}
	if (piece.pattern) return piece.pattern;
	return VALUE_PATTERNS[piece.type];
};

const regExForTemplate = (pieces : TemplatePart[], subordinate : boolean, loop : boolean) : RegExp => {
	let patternString = (!subordinate && !loop) ? '^' : '';
	//if it's a loop we'll wrap it in a non-capturing non-greedy-matching group
	//so the first match group will be the first instance of the match.
	if (loop) patternString += '(?:';
	for (const piece of pieces) {
		if (typeof piece == 'string') {
			//We want to take literal strings as literal matches, which requires escaping special characters.
			patternString += escapeRegExp(piece);
			continue;
		}
		patternString += '(' + (subordinate ? '?:' : '') + subPatternForLoopPiece(piece, subordinate) + ')';
		
		if (piece.optional) patternString += '?';
	}
	if (loop) patternString += ')+?';
	if (!subordinate && !loop) patternString += '$';
	return new RegExp(patternString, 'gi');
};

const extractForPiece = (match : string, piece : TemplatePartReplacement) : TemplateValue => {
	if (!piece.loop) {
		const converter = VALUE_EXTRACTORS[piece.type];
		return converter(match);
	}
	return extractForTemplateArray(match, piece.loop);
};

//The implemntation fo both extractForTemplateSingle and extractForTemplateArray.
const _extractForTemplate = (input : string, pieces : TemplatePart[], loop : boolean) : TemplateVars | TemplateValueArray => {
	//TODO: cache regEx
	const r = regExForTemplate(pieces, false, loop);
	const vars = pieces.filter(piece => typeof piece != 'string') as TemplatePartReplacement[];
	const results : TemplateValueArray = [];
	for (const matches  of input.matchAll(r)) {
		if (!matches) throw new Error('No matches');
		const result : TemplateVars = defaultForPieces(pieces);
		for (const [i, v] of vars.entries()) {
			const match = matches[i + 1];
			//If it had a default, it was already set at result initalization,
			//and if it doesn't we're supposed to skip anyway.
			if (match == undefined || match == '') continue;
			//If it's '_' then we're told to drop it on the floor.
			if (v.var == IGNORE_VAR) continue;
			setObjectProperty(result, v.var, extractForPiece(match, v));
		}
		results.push(result);
	}
	if (results.length == 0) throw new Error('No matches');
	return loop ? results : results[0];
};

const extractForTemplateSingle = (input : string, pieces : TemplatePart[]) : TemplateVars => {
	return _extractForTemplate(input, pieces, false) as TemplateVars;
};

const extractForTemplateArray = (input : string, pieces : TemplatePart[]) : TemplateValueArray => {
	return _extractForTemplate(input, pieces, true) as TemplateValueArray;
};

export class Template {

	_pieces : TemplatePart[];
	
	constructor(pattern : string) {
		this._pieces = parseTemplate(pattern);
	}

	render(vars : TemplateVars): string {
		return renderTemplatePieces(this._pieces, vars);
	}

	extract(input : string) : TemplateVars {
		return extractForTemplateSingle(input, this._pieces);
	}
}