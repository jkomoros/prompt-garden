import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import { Environment } from '../../src/environment.js';
import { makeEnvironmentChangedEvent } from '../events.js';
import { EDIT_ICON, PLUS_ICON } from './my-icons.js';

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
		return html`<div class='row' data-key=${key}>
			<span>${key}</span>:
			<span>${val}</span>
			<button class='small' title='Edit' @click=${this._handleEditKeyClicked}>${EDIT_ICON}</button>
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

}

declare global {
	interface HTMLElementTagNameMap {
		'environment-editor': EnvironmentEditor;
	}
}
