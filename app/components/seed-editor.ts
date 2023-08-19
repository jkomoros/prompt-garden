import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	fromZodError
} from 'zod-validation-error';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	seedData,
	SeedData
} from '../../src/types.js';

import {
	changePropertyType,
	EMPTY_PROPERTY_SHAPE,
	EMPTY_SEED_SHAPE,
	SeedShape,
	SHAPE_BY_SEED
} from '../../src/meta.js';

import {
	ObjectPath,
	Choice
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	help,
	HelpStyles
} from './help-badges.js';

import {
	makePropertyChangedEvent
} from '../events.js';

import './value-editor.js';

const defaultValueForSeedProperty = (shape : SeedShape, prop : string) : unknown => {
	const propValue = shape.arguments[prop] || shape.options[prop] || EMPTY_PROPERTY_SHAPE;
	return changePropertyType('', propValue.allowedTypes[0]);
};

@customElement('seed-editor')
export class SeedEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type:Object})
		seed? : SeedData;

	@property({type: Array})
		path: ObjectPath = [];

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			HelpStyles
		];
	}

	get seedShape() : SeedShape {
		const seed = this.seed;
		if (!seed) return EMPTY_SEED_SHAPE;
		const shape = SHAPE_BY_SEED[seed.type];
		if (!shape) return EMPTY_SEED_SHAPE;
		return shape;
	}

	override render() : TemplateResult {
		const seed = this.seed || {};
		const seedDataShape = this.seedShape;
		const legalKeys = [...Object.keys(seedDataShape.options), ...Object.keys(seedDataShape.arguments)];
		const missingKeys = legalKeys.filter(key => !(key in seed));
		const missingOptionsKeys = missingKeys.filter(key => key in seedDataShape.options);
		const missingArgumentsKeys = missingKeys.filter(key => key in seedDataShape.arguments);
		const missingArgumentsRequiredKeys = missingArgumentsKeys.filter(key => !seedDataShape.arguments[key].optional);
		const missingArgumentsOptionalKeys = missingArgumentsKeys.filter(key => seedDataShape.arguments[key].optional);

		return html`${TypedObject.keys(seed).map(prop => this._controlForProperty(prop))}
		${missingKeys.length ? html`<select .value=${''} @change=${this._handleAddKeyChanged} ?disabled=${!this.editable}>
		<option .value=${''} selected><em>Add a property...</em></option>
		${missingArgumentsRequiredKeys.map(key => html`<option .value=${key} .title=${seedDataShape.arguments[key]?.description || key}>${key} (required)</option>`)}
		${missingArgumentsOptionalKeys.map(key => html`<option .value=${key} .title=${seedDataShape.arguments[key]?.description || key}>${key}</option>`)}
		${missingArgumentsKeys.length && missingOptionsKeys.length ? html`<option disabled>_________</option>` : ''}
		${missingOptionsKeys.map(key => html`<option .value=${key} .title=${seedDataShape.options[key]?.description || key}>${key}</option>`)}
	</select>` : ''}
		`;
	}

	_controlForProperty(prop : keyof SeedData) : TemplateResult {
		const subPath = [...this.path, prop];
		if (!this.seed) return html``;
		const subData = this.seed[prop];

		let choices : Choice[] | undefined;
		let disallowTypeChange = false;
		let extra = html``;
		const propShape = this.seedShape.options[prop] || this.seedShape.arguments[prop] || EMPTY_PROPERTY_SHAPE;
		let description = propShape.description || '';
		if (prop == 'type') {
			choices = Object.entries(SHAPE_BY_SEED).map(entry => ({value:entry[0], description:entry[1].description}));
			disallowTypeChange = true;
			const safeParseResult = seedData.safeParse(this.seed);
			if (!safeParseResult.success) {
				const err = fromZodError(safeParseResult.error);
				extra = help(err.message, true, true);
			}
			description = 'The type of the seed, which defines its behavior';
		}

		return html`<div class='row'><label>${prop} ${description ? help(description) : html``}</label><value-editor .path=${subPath} .data=${subData} .choices=${choices} .disallowTypeChange=${disallowTypeChange} .editable=${this.editable}></value-editor>${extra}</div>`;
	}

	_handleAddKeyChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not a select');
		const key = ele.value;
		ele.value = '';
		const defaultValue = defaultValueForSeedProperty(this.seedShape, key);
		this.dispatchEvent(makePropertyChangedEvent([...this.path, key], defaultValue));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-editor': SeedEditor;
	}
}
