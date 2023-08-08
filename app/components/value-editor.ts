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

@customElement('value-editor')
export class ValueEditor extends LitElement {

	@property({type:Object})
		data: unknown = {};

	@property({type: Array})
		path: ObjectPath = [];

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		if (typeof this.data == 'string') {
			return html`<input type='text' .value=${this.data} readonly></input>`;
		}
		if (typeof this.data == 'number') {
			return html`<input type='number' .value=${String(this.data)} readonly></input>`;
		}
		if (typeof this.data == 'boolean') {
			return html`<input type='checkbox' .checked=${this.data} readonly></input>`;
		}
		//Fall back to just generic JSON rendering
		return html`
		<pre>${JSON.stringify(this.data, null, '\t')}</pre>			
		`;
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'value-editor': ValueEditor;
	}
}
