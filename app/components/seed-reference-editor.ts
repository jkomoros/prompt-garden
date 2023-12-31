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
	help,
	HelpStyles
} from './help-badges.js';

import {
	OPEN_IN_NEW
} from './my-icons.js';

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
	makeCurrentSeedIDChangedEvent,
	makePropertyChangedEvent,
	makePropertyDeletedEvent
} from '../events.js';

import {
	getAllPacketNames,
	getPacketOfUnknownType,
	getPacketType,
	packetNameToPath,
	pathToPacketName,
	templateForSeedID
} from '../util.js';

const CUSTOM_SENTINEL = '@CUSTOM@';
const THIS_PACKET = '(This Packet)';

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
			HelpStyles
		];
	}

	override render() : TemplateResult {
		const reference = this.reference || emptySeedReference();
		const referencePacket = pathToPacketName(reference.packet || '');
		const packetName = reference.packet === undefined ? this.currentSeedSelector.packetName : referencePacket;
		const packet = getPacketOfUnknownType(this.packets, packetName);

		//TODO: fetch referenced unknown imported packets

		const packetOptions = getAllPacketNames(this.packets);

		const customPacketSelected = reference.packet != undefined && !packetOptions.includes(referencePacket);
		const currentPacket = customPacketSelected ? CUSTOM_SENTINEL : referencePacket;

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
					<option .value=${''} .selected=${currentPacket == ''}>${THIS_PACKET}</option>
					${packetOptions.map(option => html`
						<option
							.value=${option}
							.selected=${option == currentPacket}
							?disabled=${option == this.currentSeedSelector.packetName}
							.title=${option == this.currentSeedSelector.packetName ? 'Use ' + THIS_PACKET : option}
						>${option}</option>`)}
					<option .value=${CUSTOM_SENTINEL} .selected=${customPacketSelected}><em>Custom...${customPacketSelected ? ' (' + (reference.packet || '') + ')' : ''}</em></option>
				</select>
			</div>
			<div class='row'>
				<label>${SEED_PROPERTY}</label>
				${customPacketSelected ?
		html`
					<input
						type='text'
						.value=${reference.seed}
						?disabled=${!this.editable}
						@change=${this._handleSeedChanged}
					></input>
		` :
		html`
					<select
						.value=${currentSeed}
						?disabled=${!this.editable}
						@change=${this._handleSeedChanged}
					>
					${Object.keys(seeds).map(id => html`
						<option .value=${id} .selected=${id == currentSeed}>${templateForSeedID(id)}</option>
					`)}
						<option .value=${CUSTOM_SENTINEL} .selected=${customSeedSelected}>Custom...${customSeedSelected ? ' (' + reference.seed + ')' : ''}</option>
					</select>
					${customSeedSelected ?
		help('Unknown seed selected', true, true) :
		html`<button
				class='small'
				.title=${'Navigate to seed'}
				?disabled=${!this.editable}
				@click=${this._handleNavigateToSeed}
			>${OPEN_IN_NEW}</button>`}
				`}
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
		} else {
			value = packetNameToPath(value);
		}
		this.dispatchEvent(makePropertyChangedEvent([...this.path, PACKET_PROPERTY], value));
	}

	_handleNavigateToSeed() {
		if (!this.reference) throw new Error('No data to navigate to');
		const packetName = pathToPacketName(this.reference.packet || this.currentSeedSelector.packetName);
		const packetType = getPacketType(this.packets, packetName);
		const seedID = this.reference.seed;
		this.dispatchEvent(makeCurrentSeedIDChangedEvent(packetName, packetType, seedID));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-reference-editor': SeedReferenceEditor;
	}
}
