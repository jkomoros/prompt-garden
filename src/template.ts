import {
	z
} from 'zod';

import {
	assertUnreachable
} from './util.js';

type TemplateValueLeaf = string | boolean | number;

type TemplateValueArray = TemplateVars[];

type TemplateValue = TemplateValueArray | TemplateValueLeaf;

const templateVarRegExp = new RegExp('^[a-zA-Z0-9-_]+$');

const templateVar = z.string().regex(templateVarRegExp);

type TemplateVar = z.infer<typeof templateVar>;

const templateVarType = z.union([
	z.literal('string'),
	z.literal('int'),
	z.literal('float'),
	z.literal('boolean')
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

const VALUE_CONVERTERS : {[t in TemplateVarType]: (input: string) => (number | string | boolean)} = {
	'string': (input : string) : string => input,
	'int': (input : string) : number => parseInt(input),
	'float': (input : string) : number => parseFloat(input),
	'boolean': (input : string) : boolean => {
		input = input.toLowerCase().trim();
		if (TRUE_LITERALS[input]) return true;
		if (FALSE_LITERALS[input]) return false;
		return Boolean(input);
	}
};

const VALUE_PATTERNS : {[t in TemplateVarType]: string} = {
	'string': '.*',
	'int': '-?\\d',
	'float': '-?\\d+(\\.\\d+)?',
	'boolean': [...Object.keys(TRUE_LITERALS), ...Object.keys(FALSE_LITERALS)].join('|')
};

type TemplatePartReplacement = {
	var: TemplateVar,
	default? : string;
	optional: boolean;
	type: TemplateVarType,
	loop?: TemplatePart[];
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
			result.type = 'int';
			break;
		case 'float':
			if (modifierArg) throw new Error('float does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			result.type = 'float';
			break;
		case 'boolean':
			if (modifierArg) throw new Error('boolean does not expect an argument');
			if (result.type != 'string') throw new Error('A type modifier has already been set for this variable');
			result.type = 'boolean';
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
			if (loops.length) {
				const firstLoop = loops[0];
				if (!firstLoop.loop) throw new Error('partial loop item unexpectedly had no loop array');
				firstLoop.loop.push(prefix);
			} else {
				result.push(prefix);
			}
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
			if (loops.length) {
				const firstLoop = loops[0];
				if (!firstLoop.loop) throw new Error('partial loop item unexpectedly had no loop array');
				firstLoop.loop.push(part);
			} else {
				result.push(part);
			}
			break;
		case 'loop':
			if (!part) throw new Error('Template part unexpectedly null');
			loops.unshift(part);
			break;
		case 'end':
			const piece = loops.shift();
			if (!piece) throw new Error('end command found but not in a loop context');
			if (loops.length) {
				const firstLoop = loops[0];
				if (!firstLoop.loop) throw new Error('partial loop item unexpectedly had no loop array');
				firstLoop.loop.push(piece);
			} else {
				result.push(piece);
			}
			break;
		default:
			assertUnreachable(controlType);
		}
	}
	if (loops.length) throw new Error('Unterminated loops remained at end of parsing');
	return result;
};

const escapeRegExp = (input : string) : string => {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const renderTemplatePiece = (piece : TemplatePart, vars : TemplateVars) : string => {
	if (typeof piece == 'string') return piece;
	//It's a replacement.
	const v = vars[piece.var];
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
	return String(v);
};

const renderTemplatePieces = (pieces : TemplatePart[], vars : TemplateVars) : string => {
	return pieces.map(piece => renderTemplatePiece(piece, vars)).join('');
};

const defaultForPieces = (pieces : TemplatePart[]) : TemplateVars => {
	const result : TemplateVars = {};
	for (const piece of pieces) {
		if (typeof piece == 'string') continue;
		if (piece.loop) throw new Error('Loops not yet supported in default');
		if (piece.default == undefined) continue;
		const converter = VALUE_CONVERTERS[piece.type];
		result[piece.var] = converter(piece.default);
	}
	return result;
};

export class Template {

	_pieces : TemplatePart[];
	_extract : RegExp | undefined;
	
	constructor(pattern : string) {
		this._pieces = parseTemplate(pattern);
	}

	render(vars : TemplateVars): string {
		return renderTemplatePieces(this._pieces, vars);
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
		if (this._pieces.some(piece => typeof piece != 'string' && piece.loop ? true : false)) throw new Error('extract does not yet support loops');
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
		return defaultForPieces(this._pieces);
	}
}