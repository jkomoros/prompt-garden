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
	EMPTY_SEED_SELECTOR,
	ObjectPath,
	PacketsBundle,
	Prompter,
	SeedSelector
} from '../types.js';

import {
	makePropertyChangedEvent,
	makePropertyDeletedEvent
} from '../events.js';

import {
	getPacket
} from '../util.js';

const CUSTOM_SENTINEL = '@CUSTOM@';

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

	@property({type: Object})
		currentSeedSelector : SeedSelector = EMPTY_SEED_SELECTOR;

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		const reference = this.reference || emptySeedReference();
		const packetName = reference.packet === undefined ? this.currentSeedSelector.packetName : reference.packet;
		const packetType = reference.packet === undefined ? this.currentSeedSelector.packetType : 'local';
		const packet = getPacket(this.packets, packetName, packetType);

		//TODO: if packet is remote, then just render an input not a select for seedID.
		//TODO: fetch remote packets and use them to render
		//TODO: getPacket assumes a non-pathed packetName, but reference.packet has to be a pathed packetname.

		const packetOptions = Object.keys(this.packets.local).map(id => './' + id);

		const customPacketSelected = reference.packet != undefined && !packetOptions.includes(reference.packet || '');
		const currentPacket = customPacketSelected ? CUSTOM_SENTINEL : reference.packet || '';

		const seeds = packet ? packet.data.seeds : {};

		const customSeedSelected = !Object.keys(seeds).includes(reference.seed);
		const currentSeed = customSeedSelected ? CUSTOM_SENTINEL : reference.seed;

		return html`
			<div class='row'>
				<label>${PACKET_PROPERTY}</label>
				<select
					.value=${currentPacket}
					?disabled=${!this.editable}
					@change=${this._handlePacketChanged}
				>
					<option .value=${''} .selected=${currentPacket == ''}><em>This Packet</em></option>
					${packetOptions.map(option => html`<option .value=${option} .selected=${option == currentPacket}>${option}</option>`)}
					<option .value=${CUSTOM_SENTINEL} .selected=${customPacketSelected}><em>Custom...${customPacketSelected ? ' (' + (reference.packet || '') + ')' : ''}</em></option>
				</select>
			</div>
			<div class='row'>
				<label>${SEED_PROPERTY}</label>
				<select
					.value=${currentSeed}
					?disabled=${!this.editable}
					@change=${this._handleSeedChanged}
				>
				${Object.keys(seeds).map(id => html`
					<option .value=${id} .selected=${id == currentSeed}>${id}</option>`)}
					<option .value=${CUSTOM_SENTINEL} .selected=${customSeedSelected}>Custom...${customSeedSelected ? ' (' + reference.seed + ')' : ''}</option>
				</select>
			</div>
		`;
	}

	async _handleSeedChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLInputElement) && !(ele instanceof HTMLSelectElement)) throw new Error('Not input or select as expected');
		let value = ele.value;
		if (value == CUSTOM_SENTINEL) {
			const question = 'What should the seedID be?';
			if (this.prompter) {
				value = await this.prompter.prompt(question, '');
			} else {
				value = prompt(question, '') || '';
			}
		}
		this.dispatchEvent(makePropertyChangedEvent([...this.path, SEED_PROPERTY], value));
	}

	async _handlePacketChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLInputElement) && !(ele instanceof HTMLSelectElement)) throw new Error('Not input or select as expected');
		let value = ele.value;
		if (value == '') {
			this.dispatchEvent(makePropertyDeletedEvent([...this.path, PACKET_PROPERTY]));
			return;
		}
		if (value == CUSTOM_SENTINEL) {
			const question = 'What should the URL of the packet be?';
			if (this.prompter) {
				value = await this.prompter.prompt(question, '');
			} else {
				value = prompt(question, '') || '';
			}
		}
		this.dispatchEvent(makePropertyChangedEvent([...this.path, PACKET_PROPERTY], value));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-reference-editor': SeedReferenceEditor;
	}
}
