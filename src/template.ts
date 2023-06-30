import {
	z
} from 'zod';


const templateVar = z.string();

const templatePartReplacement = z.object({
	var : templateVar,
});

const templatePart = z.union([
	templatePartReplacement,
	z.string()
]);

type TemplatePart = z.infer<typeof templatePart>;

const templateValue = z.union([
	z.string(),
	z.boolean(),
	z.number()
]);

const templateVars = z.record(templateVar, templateValue);

type TemplateVars =z.infer<typeof templateVars>;

const REPLACEMENT_START = '{{';
const REPLACEMENT_END = '}}';

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
		result.push({
			var: subPieces[0].trim()
		});
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
			if (vars[piece.var] === undefined) throw new Error(`Template had a placeholder for ${piece.var} but it did not exist in vars.`);
			return String(vars[piece.var]);
		}).join('');
	}
}