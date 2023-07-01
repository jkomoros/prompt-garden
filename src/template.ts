import {
	z
} from 'zod';


const templateValue = z.union([
	z.string(),
	z.boolean(),
	z.number()
]);


const templateVar = z.string();

const templatePartReplacement = z.object({
	var : templateVar,
	default: templateValue.optional()
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

const parseTemplatePartReplacement = (innerPattern : string) : TemplatePartReplacement =>  {
	innerPattern = innerPattern.trim();
	let [firstPart, rest] = extractUpToQuote(innerPattern, VARIABLE_MODIFIER_DELIMITER);
	firstPart = firstPart.trim();
	const result : TemplatePartReplacement = {
		var: firstPart
	};
	let command = '';
	while (rest.length) {
		[command, rest] = extractUpToQuote(rest, VARIABLE_MODIFIER_DELIMITER);
		const modifierType = command.includes(VARIABLE_MODIFIER_INNER_DELIMITER) ? command.substring(0, command.indexOf(VARIABLE_MODIFIER_INNER_DELIMITER)) : command;
		const modifierArg = command.includes(VARIABLE_MODIFIER_INNER_DELIMITER) ? command.substring(command.indexOf(VARIABLE_MODIFIER_INNER_DELIMITER) + VARIABLE_MODIFIER_INNER_DELIMITER.length).trim() : '';
		switch (modifierType.trim()) {
		case 'default':
			if (!modifierArg) throw new Error('The default modifier expects a string argument');
			if (!modifierArg.startsWith('\'') || !modifierArg.endsWith('\'')) throw new Error('Default must start and end with a \'');
			result.default = modifierArg.substring(1, modifierArg.length - 1);
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
	let char = '';
	while (index < input.length) {
		char = input.substring(index, index + 1);
		result += char;
		index++;
		//Should we enter or exit string mode?
		if (withinString) {
			//TODO: support ignoring escaped quote within a quote.
			if (char == '\'') withinString = false;
		} else {
			//TODO: support double quote
			if (char == '\'') withinString = true;
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

export class Template {

	_pieces : TemplatePart[];
	
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
}