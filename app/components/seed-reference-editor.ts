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
	SeedReference
} from '../../src/types.js';

import {
	ObjectPath
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import './value-editor.js';

@customElement('seed-reference-editor')
export class SeedReferenceEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type:Object})
		reference? : SeedReference;

	@property({type: Array})
		path: ObjectPath = [];

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		return html`${TypedObject.keys(this.reference || {}).map(prop => this._controlForProperty(prop))}`;
	}

	_controlForProperty(prop : keyof SeedReference) : TemplateResult {
		const subPath = [...this.path, prop];
		if (!this.reference) return html``;
		const subData = this.reference[prop];

		return html`<div class='row'><label>${prop}</label><value-editor .path=${subPath} .data=${subData} .editable=${this.editable}></value-editor></div>`;
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'seed-reference-editor': SeedReferenceEditor;
	}
}
