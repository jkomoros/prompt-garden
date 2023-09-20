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
	SeedReference, emptySeedReference
} from '../../src/types.js';

import {
	EMPTY_PACKETS_BUNDLE,
	ObjectPath,
	PacketsBundle
} from '../types.js';

import './value-editor.js';

@customElement('seed-reference-editor')
export class SeedReferenceEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type:Object})
		reference? : SeedReference;

	@property({type: Array})
		path: ObjectPath = [];

	@property({type: Object})
		packets : PacketsBundle = EMPTY_PACKETS_BUNDLE;

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		const reference = this.reference || emptySeedReference();
		return html`
			<div class='row'>
				<label>packet</label>
				${reference.packet === undefined ? html`<em>Local Packet</em>` : html`
				<value-editor
					.path=${[...this.path, 'packet']}
					.data=${reference.packet}
					.editable=${this.editable}
					.packets=${this.packets}
				></value-editor>
				`}
			</div>
			<div class='row'>
				<label>seed</label>
				<value-editor
					.path=${[...this.path, 'seed']}
					.data=${reference.seed}
					.editable=${this.editable}
					.packets=${this.packets}
				></value-editor>
			</div>
		`;
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-reference-editor': SeedReferenceEditor;
	}
}
