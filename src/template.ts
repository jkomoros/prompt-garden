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

const parseTemplate = (pattern : string) : TemplatePart[] => {
	const pieces = pattern.split(REPLACEMENT_START);
	const result : TemplatePart[] = [];
	for (const [i, piece] of pieces.entries()) {
		if (i == 0) {
			if (piece.includes(REPLACEMENT_END)) throw new Error(`An extra ${REPLACEMENT_END} was found`);
			//The first piece is the string before the first {{
			result.push(piece);
			continue;
		}
		const subPieces = piece.split(REPLACEMENT_END);
		if (subPieces.length == 1) throw new Error(`A ${REPLACEMENT_START} was missing a ${REPLACEMENT_END}`);
		if (subPieces.length > 2) throw new Error(`An extra ${REPLACEMENT_END} was found`);
		result.push(parseTemplatePartReplacement(subPieces[0]));
		result.push(subPieces[1]);
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