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
	seedData,
	SeedData,
	SeedDataTypes
} from '../../src/types.js';

import {
	ObjectPath
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	help,
	HelpStyles
} from './help-badges.js';

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
			HelpStyles
		];
	}

	override render() : TemplateResult {
		return html`${TypedObject.keys(this.seed || {}).map(prop => this._controlForProperty(prop))}`;
	}

	_controlForProperty(prop : keyof SeedData) : TemplateResult {
		const subPath = [...this.path, prop];
		if (!this.seed) return html``;
		const subData = this.seed[prop];

		let choices : string[] | undefined;
		let disallowTypeChange = false;
		let extra = html``;
		if (prop == 'type') {
			choices = SeedDataTypes;
			disallowTypeChange = true;
			const safeParseResult = seedData.safeParse(this.seed);
			if (!safeParseResult.success) {
				extra = help(String(safeParseResult.error), true);
			}
		}

		return html`<div class='row'><label>${prop}</label><value-editor .path=${subPath} .data=${subData} .choices=${choices} .disallowTypeChange=${disallowTypeChange}></value-editor>${extra}</div>`;
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'seed-editor': SeedEditor;
	}
}
