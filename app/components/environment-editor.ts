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
	Environment, SECRET_KEY_VALUE
} from '../../src/environment.js';

import {
	makeEnvironmentChangedEvent,
	makeEnvironmentDeletedEvent
} from '../events.js';

import {
	CANCEL_ICON,
	EDIT_ICON,
	PLUS_ICON
} from './my-icons.js';

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
		return html`
			<div class='container'>
				<div class='row'>
					<label>Environment</label>
				</div>
				${this.environment ? this.environment.keys().map(key => this._rowForKey(key)) : html``}
				<div class='row'>
					<button class='small' @click=${this._handleAddKeyClicked} title='Add an environment variable'>${PLUS_ICON}</button>
				</div>
			</div>
		`;
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

	_handleAddKeyClicked() {
		const key = prompt('What environment property do you want to set?', 'openai_api_key');
		if (!key) throw new Error('No key provided');
		const value = prompt(`What do you want to set the value of '${key}' to?`);
		this.dispatchEvent(makeEnvironmentChangedEvent(key, value));
	}

	_handleEditKeyClicked(e : MouseEvent) {
		if (!this.environment) throw new Error('No environment');
		const key = this._getKeyName(e);
		const value = this.environment.get(key);
		const newValue = prompt(`What should the new value of ${key} be?`, String(value));
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
