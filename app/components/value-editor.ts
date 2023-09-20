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
	Choice,
	CollapsedSeedMap,
	Prompter,
	PacketsBundle,
	EMPTY_PACKETS_BUNDLE,
	SeedSelector,
	EMPTY_SEED_SELECTOR
} from '../types.js';

import {
	makePropertyChangedEvent,
	makePropertyDeletedEvent,
	makePropertyMovedEvent
} from '../events.js';

import {
	SeedData,
	SeedReference,
} from '../../src/types.js';

import {
	assertUnreachable,
} from '../../src/util.js';

import {
	CANCEL_ICON,
	PLUS_ICON,
	ARROW_SPLIT_ICON,
	FIT_SCREEN_ICON
} from './my-icons.js';

import {
	propertyType,
	PropertyType,
	changePropertyType,
	PROPERTY_TYPES
} from '../../src/meta.js';

import './seed-editor.js';
import './seed-reference-editor.js';

@customElement('value-editor')
export class ValueEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type: Object})
		prompter? : Prompter;

	@property({type:Object})
		data: unknown = {};

	@property({type:Object})
		collapsed? : CollapsedSeedMap;

	@property({type: Object})
		packets : PacketsBundle = EMPTY_PACKETS_BUNDLE;

	@property({type: Object})
		currentSeedSelector : SeedSelector = EMPTY_SEED_SELECTOR;

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
			inner = html`<input
					type='text'
					.value=${this.data as string}
					@change=${this._handlePropertyChanged}
					?disabled=${!this.editable}
				>
				</input>`;
			break;
		case 'number':
			inner = html`<input
					type='number'
					.value=${String(this.data)}
					@change=${this._handlePropertyChanged}
					?disabled=${!this.editable}
				>
				</input>`;
			break;
		case 'boolean':
			inner = html`<input
					type='checkbox'
					.checked=${this.data as boolean}
					@change=${this._handlePropertyChanged}
					?disabled=${!this.editable}
				>
				</input>`;
			break;
		case 'null':
			inner = html` <em>null</em>`;
			break;
		case 'seed':
			inner = html`<seed-editor
					.seed=${this.data as SeedData}
					.collapsed=${this.collapsed}
					.path=${this.path}
					.editable=${this.editable}
					.prompter=${this.prompter}
					.packets=${this.packets}
					.currentSeedSelector=${this.currentSeedSelector}
				>
				</seed-editor>`;
			break;
		case 'reference':
			inner = html`<seed-reference-editor
				.reference=${this.data as SeedReference}
				.path=${this.path}
				.editable=${this.editable}
				.packets=${this.packets}
				.prompter=${this.prompter}
				.currentSeedSelector=${this.currentSeedSelector}
			>
			</seed-reference-editor>`;
			break;
		case 'array':
			//Convince typescript it's an array;
			if (!Array.isArray(this.data)) throw new Error('Not array as expected');
			inner = html`${this.data.map((value, index) => html`<div class='row'>
					<label>${index}</label>
					<value-editor
						.path=${[...this.path, index]}
						.data=${value}
						.editable=${this.editable}
						.prompter=${this.prompter}
						.packets=${this.packets}
						.currentSeedSelector=${this.currentSeedSelector}
					>
					</value-editor>
				</div>`)}
				<button
					class='small'
					.title=${'Add Item'}
					?disabled=${!this.editable}
					@click=${this._handleAddItemClicked}
				>
				${PLUS_ICON}
				</button>`;
			break;
		case 'object':
			inner = html`${Object.entries(this.data as Record<string, unknown>).map(entry => html`<div class='row'>
					<label>${entry[0]}</label>
					<value-editor
						.path=${[...this.path, entry[0]]}
						.data=${entry[1]}
						.editable=${this.editable}
						.prompter=${this.prompter}
						.packets=${this.packets}
					>
					</value-editor>
				</div>`)}
				<button
					class='small'
					.title=${'Add property'}
					?disabled=${!this.editable}
					@click=${this._handleAddPropertyClicked}
				>
				${PLUS_ICON}
				</button>`;
			break;
		default:
			assertUnreachable(typ);
		}

		if (this.choices) {
			//Ensure choices list has canonical shape
			const choices = this.choices.map(choice => typeof choice == 'string' ? {value: choice} : choice);
			if (typeof this.data != 'string') throw new Error('choices provided but data is not string');
			inner = html`<select
				.value=${this.data}
				@change=${this._handlePropertyChanged}
				?disabled=${!this.editable}>
			${choices.map(choice => html`<option
					.value=${choice.value}
					.selected=${this.data == choice.value}
					.title=${choice.description || choice.display || choice.value}
				>
					${choice.display || choice.value}
				</option>`)}
			</select>`;
		}

		const select = this.disallowTypeChange ? html`` : html`<select
			.value=${typ}
			@change=${this._handleTypeChanged}
			?disabled=${!this.editable}>
			${Object.keys(PROPERTY_TYPES).map(key => html`<option .value=${key} .selected=${key == typ}>${key}</option>`)}
	</select>`;

		const del = this.disallowDelete ? html`` : html`<button
				class='small'
				.title=${`Delete property ${this.name}`}
				@click=${this._handleDeleteClicked}
				?disabled=${!this.editable}
			>
				${CANCEL_ICON}
			</button>`;

		//Don't show it it in an array context
		const noShuffle = this.path.length ? typeof this.path[this.path.length - 1] == 'number' : false;

		const shuffle = noShuffle || this.disallowDelete || this.disallowTypeChange ? html`` : html`<button
			class='small'
			.title=${`Swap property ${this.name}`}
			@click=${this._handleSwapPropertyClicked}
			?disabled=${!this.editable}
		>${ARROW_SPLIT_ICON}</button>`;

		const nest = this.disallowDelete || this.disallowTypeChange ? html`` : html`<button
			class='small'
			.title=${`Nest property ${this.name} inside a new seed`}
			@click=${this._handleNestPropertyClicked}
			?disabled=${!this.editable}
		>${FIT_SCREEN_ICON}</button>
		`;

		return html`${select}${del}${shuffle}${nest}${inner}`;
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

	async _handleSwapPropertyClicked() {
		if (this.path.length == 0) return;
		const lastItem = this.path[this.path.length - 1];
		if (typeof lastItem == 'number') throw new Error('Not valid in an array context');
		let newItem = lastItem;
		const question = 'What should the new property name be?';
		if (this.prompter) {
			newItem = await this.prompter.prompt(question, lastItem);
		} else {
			newItem = prompt(question, lastItem) || '';
		}
		if (!newItem || newItem == lastItem) throw new Error('No update');
		const newPath = [...this.path.slice(0, -1), newItem];
		this.dispatchEvent(makePropertyMovedEvent(this.path, newPath));
	}

	_handleAddItemClicked() {
		const data = this.data;
		//Convince typescript it's an array
		if (!Array.isArray(data)) throw new Error('Data was not an array as expected');
		const lastItem = data.length == 0 ? '' : data[data.length - 1];
		const lastType = propertyType(lastItem);
		const newItem = changePropertyType('',lastType);
		this.dispatchEvent(makePropertyChangedEvent([...this.path, data.length], newItem));
	}

	async _handleAddPropertyClicked() {
		let name = '';
		const message = 'What propety should be added?';
		if (this.prompter) {
			name = await this.prompter.prompt(message, 'property');
		} else {
			name = prompt(message, 'property') || '';
		}
		//TODO: set it to the same type as earlier items.
		this.dispatchEvent(makePropertyChangedEvent([...this.path, name], ''));
	}

	_handleNestPropertyClicked() {
		//This iwll naturally wrap it in a seed;
		const value = changePropertyType(this.data, 'seed');
		this.dispatchEvent(makePropertyChangedEvent(this.path, value));
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'value-editor': ValueEditor;
	}
}
