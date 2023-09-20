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
	SeedReference,
	emptySeedReference
} from '../../src/types.js';

import {
	EMPTY_PACKETS_BUNDLE,
	ObjectPath,
	PacketsBundle,
	Prompter
} from '../types.js';

import {
	makePropertyChangedEvent
} from '../events.js';

//use keyof just to make it more likely if SeedReference changes shape we'll get
//a typescript error.
const SEED_PROPERTY : keyof SeedReference = 'seed';
const PACKET_PROPERTY : keyof SeedReference = 'packet';

@customElement('seed-reference-editor')
export class SeedReferenceEditor extends LitElement {

	@property({type:Boolean})
		editable = false;

	@property({type:Object})
		reference? : SeedReference;

	@property({type: Object})
		prompter? : Prompter;

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
				<label>${PACKET_PROPERTY}</label>
				${reference.packet === undefined ? html`<em>Local Packet</em>` : html`
				<input
					.value=${reference.packet}
					?disabled=${!this.editable}
					@change=${this._handlePacketChanged}
				></input>`}
			</div>
			<div class='row'>
				<label>${SEED_PROPERTY}</label>
				<input
					.value=${reference.seed}
					?disabled=${!this.editable}
					@change=${this._handleSeedChanged}
				></input>
			</div>
		`;
	}

	_handleSeedChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLInputElement)) throw new Error('Not input as expected');
		const value = ele.value;
		this.dispatchEvent(makePropertyChangedEvent([...this.path, SEED_PROPERTY], value));
	}

	_handlePacketChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLInputElement)) throw new Error('Not input as expected');
		const value = ele.value;
		this.dispatchEvent(makePropertyChangedEvent([...this.path, PACKET_PROPERTY], value));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-reference-editor': SeedReferenceEditor;
	}
}
