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
	ObjectPath
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
	objectShouldBeReference,
	objectShouldBeSeed
} from '../../src/util.js';

import {
	CANCEL_ICON
} from './my-icons.js';

import './seed-editor.js';
import './seed-reference-editor.js';

const DATA_TYPES = {
	string: true,
	boolean: true,
	number: true,
	null: true,
	array: true,
	object: true,
	seed: true,
	reference: true
} as const;

//TODO: better name
type DataType = keyof (typeof DATA_TYPES);

const SIMPLE_TYPES = {
	'string': true,
	'number': true,
	'boolean': true
} as const;

const dataType = (data : unknown) : DataType => {
	const typ = typeof data;
	if (typ != 'object') {
		if (typ in SIMPLE_TYPES) return typ as DataType;
		throw new Error(`Unexpected type: ${typ}`);
	}
	if (!data) return 'null';
	if (Array.isArray(data)) return 'array';
	if (objectShouldBeReference(data)) return 'reference';
	if (objectShouldBeSeed(data)) return 'seed';
	return 'object';
};

const changeDataType = (data : unknown, to : DataType) : unknown => {

	switch (to) {
	case 'string':
		return String(data);
	case 'number':
		const parseResult = parseFloat(String(data));
		return isNaN(parseResult) ? 0 : parseResult;
	case 'boolean':
		return Boolean(data);
	case 'null':
		return null;
	case 'object':
		if (!data || typeof data != 'object') return { property: data};
		if (Array.isArray(data)) return Object.fromEntries(data.entries());
		if (objectShouldBeSeed(data)) {
			const result : Record<string, unknown> = {...data};
			delete result['type'];
			return result;
		}
		if (objectShouldBeReference(data)) {
			const result : Record<string, unknown> = {...data};
			delete result['seed'];
			return result;
		}
		return data;
	case 'array':
		return [data];
	case 'reference':
		return {
			seed: ''
		};
	case 'seed':
		return {
			type: 'noop',
			value: data
		};
	default:
		return assertUnreachable(to);
	}

};

@customElement('value-editor')
export class ValueEditor extends LitElement {

	@property({type:Object})
		data: unknown = {};

	@property({type:Array})
		choices?: string[];

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

		const typ = dataType(this.data);

		switch(typ) {
		case 'string':
			inner = html`<input type='text' .value=${this.data as string} @change=${this._handlePropertyChanged}></input>`;
			break;
		case 'number':
			inner = html`<input type='number' .value=${String(this.data)} @change=${this._handlePropertyChanged}></input>`;
			break;
		case 'boolean':
			inner = html`<input type='checkbox' .checked=${this.data as boolean} @change=${this._handlePropertyChanged}></input>`;
			break;
		case 'null':
			inner = html` <em>null</em>`;
			break;
		case 'seed':
			inner = html`<seed-editor .seed=${this.data as SeedData} .path=${this.path}></seed-editor>`;
			break;
		case 'reference':
			inner = html`<seed-reference-editor .reference=${this.data as SeedReference} .path=${this.path}></seed-reference-editor>`;
			break;
		case 'array':
		case 'object':
			inner = html`${Object.entries(this.data as Record<string, unknown>).map(entry => html`<div class='row'><label>${entry[0]}</label><value-editor .path=${[...this.path, entry[0]]} .data=${entry[1]}></value-editor></div>`)}`;
			break;
		default:
			assertUnreachable(typ);
		}

		if (this.choices) {
			if (typeof this.data != 'string') throw new Error('choices provided but data is not string');
			inner = html`<select .value=${this.data} @change=${this._handlePropertyChanged}>
			${this.choices.map(choice => html`<option .value=${choice} .selected=${this.data == choice}>${choice}</option>`)}
			</select>`;
		}

		const select = this.disallowTypeChange ? html`` : html`<select .value=${typ} @change=${this._handleTypeChanged}>
			${Object.keys(DATA_TYPES).map(key => html`<option .value=${key} .selected=${key == typ}>${key}</option>`)}
	</select>`;

		const del = this.disallowDelete ? html`` : html`<button class='small' .title=${`Delete property ${this.name}`} @click=${this._handleDeleteClicked}>${CANCEL_ICON}</button>`;

		return html`${select}${inner}${del}`;
	}

	_handlePropertyChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement) && !(ele instanceof HTMLInputElement)) throw new Error('not select or input element');
		const value = (ele instanceof HTMLInputElement && ele.type == 'checkbox') ? ele.checked : ele.value;
		this.dispatchEvent(makePropertyChangedEvent(this.path, value));
	}

	_handleTypeChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('Not select element as expected');
		const typ = ele.value as DataType;
		this.dispatchEvent(makePropertyChangedEvent(this.path, changeDataType(this.data, typ)));
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
