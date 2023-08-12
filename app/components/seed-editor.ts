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
	SeedData,
} from '../../src/types.js';

import {
	ObjectPath
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import './value-editor.js';

@customElement('seed-editor')
export class SeedEditor extends LitElement {

	@property({type:Object})
		seed? : SeedData;

	@property({type: Array})
		path: ObjectPath = [];

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		return html`${TypedObject.keys(this.seed || {}).map(prop => this._controlForProperty(prop))}`;
	}


	_controlForProperty(prop : keyof SeedData) : TemplateResult {
		const subPath = [...this.path, prop];
		if (!this.seed) return html``;
		const subData = this.seed[prop];
		//TODO: render choices for `t`. 
		//TODO: if the sub-data is a seed, render a seed-editor.
		//TODO: if the sub-data is a reference, render a reference.
		return html`<label>${prop}</label><value-editor .path=${subPath} .data=${subData}></value-editor>`;
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'seed-editor': SeedEditor;
	}
}
