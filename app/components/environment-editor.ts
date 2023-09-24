import { LitElement } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
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

import {
	changePropertyType,
	choicesAsStrings,
	getInfoForEnvironmentKey
} from '../../src/meta.js';

import {
	environmentContext,
	EnvironmentContext,
	Prompter,
	WrappedPacket
} from '../types.js';

const NOOP_SENTINEL = '@NOOP';

@customElement('environment-editor')
export class EnvironmentEditor extends LitElement {

	@property({type: Object})
		environment? : Environment;

	@property({type: Object})
		prompter? : Prompter;

	//If set, this will render controls to allow editing the environment.
	@property({type: Object})
		currentPacket? : WrappedPacket;

	@state()
		_environmentContext : EnvironmentContext = 'global';

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles
		];
	}

	override render() : TemplateResult {
		const keys = knownEnvironmentKey.options;
		let env = this.environment;
		if (this._environmentContext == 'packet') {
			if (!this.currentPacket) throw new Error('Context was packet but no packet provided');
			env = new Environment(this.currentPacket.data.environment || {});
		}
		const existingKeys = env ? env.keys() : [];
		const existingKeysMap : {[key : string]: true} = Object.fromEntries(existingKeys.map(key => [key, true]));
		//TODO: only show rows for keys not yet included
		return html`
			<div class='container'>
				<div class='row'>
					<label>Environment</label>
					${this.currentPacket ?
		html`
					<select .value=${this._environmentContext} @change=${this._handleContextChanged}>
						${environmentContext.options.map(option => html`
							<option .value=${option} .selected=${option == this._environmentContext}>${option}</option>
						`)}
					</select>
		` :
		html``}
				</div>
				${env ? env.keys().map(key => this._rowForKey(env as Environment, key)) : html``}
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

	override updated(changedProps : Map<keyof EnvironmentEditor, EnvironmentEditor[keyof EnvironmentEditor]>) {
		if (changedProps.has('currentPacket') && !this.currentPacket && this._environmentContext == 'packet') {
			this._environmentContext = 'global';
		}
	}

	_optionForKey(key : string, alreadyExists = false) : TemplateResult {
		const info = getInfoForEnvironmentKey(key);

		let disabledReason = '';

		if (alreadyExists) {
			disabledReason = `${key} is already set`;
		}
		if (info.internal) {
			disabledReason = `${key} is provided as an argument and not passed in an environment`;
		}

		const title = (disabledReason ? disabledReason + '\n\n' : '') + info.description;

		return html`<option
				.value=${key}
				.disabled=${Boolean(disabledReason)}
				.title=${title}
				>
					${key}
				</option>`;
	}

	_rowForKey(env : Environment, key : string) : TemplateResult {
		const val = env.getIncludingProtected(key);
		const em = val == SECRET_KEY_VALUE;
		const description = getInfoForEnvironmentKey(key).description;
		return html`<div class='row' data-key=${key}>
			<label .title=${description}>${key}</label>
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

	async _askKey() : Promise<string | null> {
		const question = 'What environment property do you want to set?';
		const defaultValue = 'openai_api_key';
		if (this.prompter) {
			//We don't enumerate choices here because this is explciitly the
			//'other' key flow.
			return this.prompter.prompt(question, defaultValue);
		}
		return prompt(question, defaultValue);
	}

	async _askValue(key : string, def = '') : Promise<string | null> {
		const question = `What do you want to set the value of '${key}' to?`;
		const defaultValue = def;
		
		if (this.prompter) {
			const info = getInfoForEnvironmentKey(key);
			const choices = info.type == 'boolean' ? ['true', 'false'] : choicesAsStrings(info.choices);
			return this.prompter.prompt(question, defaultValue, choices);
		}
		return prompt(question, defaultValue);
	}

	_changeValue(key: string, rawValue : unknown) {
		const info = getInfoForEnvironmentKey(key);
		const value = changePropertyType(rawValue, info.type);
		this.dispatchEvent(makeEnvironmentChangedEvent(this._environmentContext, key, value));
	}

	async _handleSelectChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('Not a select');
		let key = ele.value;
		//Reselect the top option
		ele.value = NOOP_SENTINEL;
		if (key == NOOP_SENTINEL) return;
		if (!key) key = await this._askKey() || '';
		if (!key) throw new Error('No key provided');
		const value = await this._askValue(key);
		this._changeValue(key, value);
	}

	async _handleEditKeyClicked(e : MouseEvent) {
		if (!this.environment) throw new Error('No environment');
		const key = this._getKeyName(e);
		const value = this.environment.get(key);
		const newValue = await this._askValue(key, String(value));
		if (newValue == value) {
			console.log('No change made');
			return;
		}
		this._changeValue(key, newValue);
	}

	async _handleDeleteKeyClicked(e : MouseEvent) {
		const key = this._getKeyName(e);		
		this.dispatchEvent(makeEnvironmentDeletedEvent(this._environmentContext, key));
	}

	_handleContextChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not select element as expected');
		this._environmentContext = environmentContext.parse(ele.value);
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'environment-editor': EnvironmentEditor;
	}
}
