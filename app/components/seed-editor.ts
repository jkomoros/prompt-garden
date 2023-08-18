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

import './value-editor.js';
import { makePropertyChangedEvent } from '../events.js';

@customElement('seed-editor')
export class SeedEditor extends LitElement {

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

		return html`${TypedObject.keys(seed).map(prop => this._controlForProperty(prop))}
		${missingKeys.length ? html`<select .value=${''} @change=${this._handleAddKeyChanged}>
		<option .value=${''} selected><em>Add a property...</em></option>
		${missingArgumentsKeys.map(key => html`<option .value=${key} .title=${seedDataShape.arguments[key]?.description || key}>${key}</option>`)}
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
		if (prop == 'type') {
			choices = Object.entries(SHAPE_BY_SEED).map(entry => ({value:entry[0], description:entry[1].description}));
			disallowTypeChange = true;
			const safeParseResult = seedData.safeParse(this.seed);
			if (!safeParseResult.success) {
				const err = fromZodError(safeParseResult.error);
				extra = help(err.message, true);
			}
		}

		return html`<div class='row'><label>${prop}</label><value-editor .path=${subPath} .data=${subData} .choices=${choices} .disallowTypeChange=${disallowTypeChange}></value-editor>${extra}</div>`;
	}

	_handleAddKeyChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not a select');
		const key = ele.value;
		ele.value = '';
		//TODO: set the  defaultValue based on the type we're adding.
		const defaultValue = '';
		this.dispatchEvent(makePropertyChangedEvent([...this.path, key], defaultValue));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-editor': SeedEditor;
	}
}
