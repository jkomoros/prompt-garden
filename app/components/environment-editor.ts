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
	Environment,
	SECRET_KEY_VALUE
} from '../../src/environment.js';

import {
	makeEnvironmentChangedEvent,
	makeEnvironmentDeletedEvent
} from '../events.js';

import {
	CANCEL_ICON,
	EDIT_ICON
} from './my-icons.js';

import {
	knownEnvironmentKey
} from '../../src/types.js';

const NOOP_SENTINEL = '@NOOP';

@customElement('environment-editor')
export class EnvironmentEditor extends LitElement {

	@property({type: Object})
		environment? : Environment;

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles
		];
	}

	override render() : TemplateResult {
		const keys = knownEnvironmentKey.options;
		const existingKeys = this.environment ? this.environment.keys() : [];
		const existingKeysMap : {[key : string]: true} = Object.fromEntries(existingKeys.map(key => [key, true]));
		//TODO: only show rows for keys not yet included
		//TODO: show description of keys
		return html`
			<div class='container'>
				<div class='row'>
					<label>Environment</label>
				</div>
				${this.environment ? this.environment.keys().map(key => this._rowForKey(key)) : html``}
				<div class='row'>
					<select value='' @change=${this._handleSelectChanged}>
						<option .value=${NOOP_SENTINEL}>Add a key...</option>
						${keys.map(key => this._optionForKey(key, existingKeysMap[key]))}
						<option value=''><em>Custom...</em></option>
					</select>
				</div>
			</div>
		`;
	}

	_optionForKey(key : string, alreadyExists = false) : TemplateResult {
		return html`<option
				.value=${key}
				.disabled=${alreadyExists}
				.title=${alreadyExists ? `${key} is already set` : key}
				>
					${key}
				</option>`;
	}

	_rowForKey(key : string) : TemplateResult {
		if (!this.environment) return html``;
		const val = this.environment.get(key);
		const em = val == SECRET_KEY_VALUE;
		return html`<div class='row' data-key=${key}>
			<label>${key}</label>
			${em ? html`<em title='Secret values are hidden'>${val}</em>` : html`<span>${val}</span>`}
			<button class='small' title='Edit' @click=${this._handleEditKeyClicked}>${EDIT_ICON}</button>
			<button class='small' title='Delete' @click=${this._handleDeleteKeyClicked}>${CANCEL_ICON}</button>
		</div>`;
	}

	_getKeyName(e : Event) : string {
		for (const ele of e.composedPath()) {
			if (!(ele instanceof HTMLElement)) continue;
			if (ele.dataset.key) return ele.dataset.key;
		}
		throw new  Error('no key in ancestor chain');
	}

	_askKey() : string | null {
		return prompt('What environment property do you want to set?', 'openai_api_key');
	}

	_askValue(key : string, def = '') : string | null {
		return prompt(`What do you want to set the value of '${key}' to?`, def);
	}

	_handleSelectChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('Not a select');
		let key = ele.value;
		//Reselect the top option
		ele.value = NOOP_SENTINEL;
		if (key == NOOP_SENTINEL) return;
		if (!key) key = this._askKey() || '';
		if (!key) throw new Error('No key provided');
		const value = this._askValue(key);
		if (!value) return;
		this.dispatchEvent(makeEnvironmentChangedEvent(key, value));
	}

	_handleEditKeyClicked(e : MouseEvent) {
		if (!this.environment) throw new Error('No environment');
		const key = this._getKeyName(e);
		const value = this.environment.get(key);
		const newValue = this._askValue(key, String(value));
		if (newValue == value) {
			console.log('No change made');
			return;
		}
		this.dispatchEvent(makeEnvironmentChangedEvent(key, newValue));
	}

	_handleDeleteKeyClicked(e : MouseEvent) {
		const key = this._getKeyName(e);
		if (!confirm(`Are you sure you want to delete ${key}?`)) return;
		this.dispatchEvent(makeEnvironmentDeletedEvent(key));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'environment-editor': EnvironmentEditor;
	}
}
