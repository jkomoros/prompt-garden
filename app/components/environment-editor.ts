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
			</div>
		`;
	}

	_rowForKey(key : string) : TemplateResult {
		if (!this.environment) return html``;
		const val = this.environment.get(key);
		return html`<div class='row'><span>${key}</span>: <span>${val}</span></div>`;
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'environment-editor': EnvironmentEditor;
	}
}
