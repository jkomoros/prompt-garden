import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

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
	makePropertyChangedEvent
} from '../events.js';

import {
	seedData,
	seedReference
} from '../../src/types.js';

import {
	assertUnreachable
} from '../../src/util.js';

//TODO: better name
type DataType = 'string' | 'boolean' | 'number' | 'array' | 'object' | 'seed' | 'reference';

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
	if (Array.isArray(data)) return 'array';
	if (seedReference.safeParse(data).success) return 'reference';
	if (seedData.safeParse(data).success) return 'seed';
	return 'object';
};

//eslint-disable-next-line @typescript-eslint/no-unused-vars
const changeData = (data : unknown, to : DataType) : unknown => {

	switch (to) {
	case 'string':
		return String(data);
	case 'number':
		const parseResult = parseFloat(String(data));
		return isNaN(parseResult) ? 0 : parseResult;
	case 'boolean':
		return Boolean(data);
	case 'object':
		if (!data || typeof data != 'object') return { property: data};
		if (Array.isArray(data)) return Object.fromEntries(data.entries());
		const seedDataParseResult = seedData.safeParse(data);
		if (seedDataParseResult.success) {
			const result : Record<string, unknown> = {...seedDataParseResult.data};
			delete result['type'];
			return result;
		}
		const seedReferenceParseResult = seedReference.safeParse(data);
		if (seedReferenceParseResult.success) {
			const result : Record<string, unknown> = {...seedReferenceParseResult.data};
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

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	get name() : string {
		return String(this.path[this.path.length - 1]);
	}

	override render() : TemplateResult {

		if (this.choices) {
			if (typeof this.data != 'string') throw new Error('choices provided but data is not string');
			return html`<select .value=${this.data} @change=${this._handlePropertyChanged}>
			${this.choices.map(choice => html`<option .value=${choice} .selected=${this.data == choice}>${choice}</option>`)}
			</select>`;
		}

		const typ = dataType(this.data);

		switch(typ) {
		case 'string':
			return html`<input type='text' .value=${this.data as string} @change=${this._handlePropertyChanged}></input>`;
		case 'number':
			return html`<input type='number' .value=${String(this.data)} @change=${this._handlePropertyChanged}></input>`;
		case 'boolean':
			return html`<input type='checkbox' .checked=${this.data as boolean} @change=${this._handlePropertyChanged}></input>`;
		case 'seed':
			return html`<seed-editor .data=${this.data} .path=${this.path}></seed-editor>`;
		case 'reference':
		case 'array':
		case 'object':
			//TODO: have a special seed-reference-editor.
			return html`${Object.entries(this.data as Record<string, unknown>).map(entry => html`<div class='row'><label>${entry[0]}</label><value-editor .path=${[...this.path, entry[0]]} .data=${entry[1]}></value-editor></div>`)}`;
		default:
			return assertUnreachable(typ);
		}
	}

	_handlePropertyChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement) && !(ele instanceof HTMLInputElement)) throw new Error('not select or input element');
		const value = (ele instanceof HTMLInputElement && ele.type == 'checkbox') ? ele.checked : ele.value;
		this.dispatchEvent(makePropertyChangedEvent(this.path, value));
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'value-editor': ValueEditor;
	}
}
