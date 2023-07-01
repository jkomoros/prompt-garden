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

const REPLACEMENT_START = '{{';
const REPLACEMENT_END = '}}';
const VARIABLE_MODIFIER_DELIMITER = '|';
const VARIABLE_MODIFIER_INNER_DELIMITER = ':';

const parseTemplatePartReplacement = (innerPattern : string) : TemplatePartReplacement =>  {
	innerPattern = innerPattern.trim();
	const parts = innerPattern.split(VARIABLE_MODIFIER_DELIMITER);
	const firstPart = parts[0].trim();
	const result : TemplatePartReplacement = {
		var: firstPart
	};
	for (const modifier of parts.slice(1)) {
		const modifierParts = modifier.split(VARIABLE_MODIFIER_INNER_DELIMITER);
		const modifierType = modifierParts[0].trim();
		switch (modifierType) {
		case 'default':
			if (modifierParts.length != 2) throw new Error('Unexpected number of ');
			let secondPart = modifierParts[1].trim();
			if (!secondPart.startsWith('\'') || !secondPart.endsWith('\'')) throw new Error('Default must start and end with a \'');
			secondPart = secondPart.substring(1, secondPart.length - 1);
			result.default = secondPart;
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