import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, css, TemplateResult} from 'lit';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	ObjectPath,
	Choice
} from '../types.js';

import {
	makePropertyChangedEvent, makePropertyDeletedEvent
} from '../events.js';

import {
	SeedData,
	SeedReference,
} from '../../src/types.js';

import {
	assertUnreachable,
} from '../../src/util.js';

import {
	CANCEL_ICON
} from './my-icons.js';

import './seed-editor.js';
import './seed-reference-editor.js';

import {
	propertyType,
	PropertyType,
	changePropertyType,
	PROPERTY_TYPES
} from '../../src/meta.js';

@customElement('value-editor')
export class ValueEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type:Object})
		data: unknown = {};

	@property({type:Array})
		choices?: Choice[];

	@property({type: Array})
		path: ObjectPath = [];

	@property({type: Boolean})
		disallowTypeChange = false;

	@property({type: Boolean})
		disallowDelete = false;

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			css`
				seed-editor, seed-reference-editor, value-editor {
					border-left: 1px solid var(--dark-gray-color);
				}
			`
		];
	}

	get name() : string {
		return String(this.path[this.path.length - 1]);
	}

	override render() : TemplateResult {

		let inner = html``;

		const typ = propertyType(this.data);

		switch(typ) {
		case 'string':
			inner = html`<input type='text' .value=${this.data as string} @change=${this._handlePropertyChanged} ?disabled=${!this.editable}></input>`;
			break;
		case 'number':
			inner = html`<input type='number' .value=${String(this.data)} @change=${this._handlePropertyChanged} ?disabled=${!this.editable}></input>`;
			break;
		case 'boolean':
			inner = html`<input type='checkbox' .checked=${this.data as boolean} @change=${this._handlePropertyChanged} ?disabled=${!this.editable}></input>`;
			break;
		case 'null':
			inner = html` <em>null</em>`;
			break;
		case 'seed':
			inner = html`<seed-editor .seed=${this.data as SeedData} .path=${this.path} .editable=${this.editable}></seed-editor>`;
			break;
		case 'reference':
			inner = html`<seed-reference-editor .reference=${this.data as SeedReference} .path=${this.path} .editable=${this.editable}></seed-reference-editor>`;
			break;
		case 'array':
		case 'object':
			inner = html`${Object.entries(this.data as Record<string, unknown>).map(entry => html`<div class='row'><label>${entry[0]}</label><value-editor .path=${[...this.path, entry[0]]} .data=${entry[1]} .editable=${this.editable}></value-editor></div>`)}`;
			break;
		default:
			assertUnreachable(typ);
		}

		if (this.choices) {
			//Ensure choices list has canonical shape
			const choices = this.choices.map(choice => typeof choice == 'string' ? {value: choice} : choice);
			if (typeof this.data != 'string') throw new Error('choices provided but data is not string');
			inner = html`<select .value=${this.data} @change=${this._handlePropertyChanged} ?disabled=${!this.editable}>
			${choices.map(choice => html`<option .value=${choice.value} .selected=${this.data == choice.value} .title=${choice.description || choice.display || choice.value}>${choice.display || choice.value}</option>`)}
			</select>`;
		}

		const select = this.disallowTypeChange ? html`` : html`<select .value=${typ} @change=${this._handleTypeChanged} ?disabled=${!this.editable}>
			${Object.keys(PROPERTY_TYPES).map(key => html`<option .value=${key} .selected=${key == typ}>${key}</option>`)}
	</select>`;

		const del = this.disallowDelete ? html`` : html`<button class='small' .title=${`Delete property ${this.name}`} @click=${this._handleDeleteClicked} ?disabled=${!this.editable}>${CANCEL_ICON}</button>`;

		return html`${select}${inner}${del}`;
	}

	_handlePropertyChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement) && !(ele instanceof HTMLInputElement)) throw new Error('not select or input element');
		let value : string | boolean | number  = (ele instanceof HTMLInputElement && ele.type == 'checkbox') ? ele.checked : ele.value;
		if (propertyType(this.data) == 'number') value = parseFloat(value as string);
		this.dispatchEvent(makePropertyChangedEvent(this.path, value));
	}

	_handleTypeChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('Not select element as expected');
		const typ = ele.value as PropertyType;
		this.dispatchEvent(makePropertyChangedEvent(this.path, changePropertyType(this.data, typ)));
	}

	_handleDeleteClicked() {
		this.dispatchEvent(makePropertyDeletedEvent(this.path));
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'value-editor': ValueEditor;
	}
}
