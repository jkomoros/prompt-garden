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
			css`
				.row {
					display: flex;
					flex-direction: row;
					align-items: center;
					margin: 0.5em 0.5em;
				}
				.row label {
					margin-right: 0.5em;
				}
			`
		];
	}

	get name() : string {
		return String(this.path[this.path.length - 1]);
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
		if (this.data && typeof this.data == 'object') {
			//TODO: handle arrays differently
			return html`${Object.entries(this.data).map(entry => html`<div class='row'><label>${entry[0]}</label><value-editor .path=${[...this.path, entry[0]]} .data=${entry[1]}></value-editor></div>`)}`;
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
