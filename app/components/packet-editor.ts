import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	PacketName,
	Packets
} from '../types.js';

import {
	makeCreatePacketEvent,
	makeCurrentPacketChangedEvent,
	makeCurrentSeedIDChangedEvent,
	makeDeletePacketEvent
} from '../events.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	DELETE_FOREVER_ICON,
	PLUS_ICON
} from './my-icons.js';

import {
	SeedData,
	SeedID,
	SeedPacket,
	emptySeedPacket
} from '../../src/types.js';

import './seed-editor.js';

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type: Object})
		packets : Packets = {};

	@property({type: String})
		currentPacketName : PacketName = '';

	@property({type: String})
		currentSeedID: SeedID = '';

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		return html`
			<div class='container'>
				<div class='controls'>
					<label>Packets</label>
					<select .value=${this.currentPacketName} @change=${this._handleCurrentPacketChanged}>
						${Object.keys(this.packets).map(name => html`<option .value='${name}' .selected=${name == this.currentPacketName}>${name}</option>`)}
					</select>
					<button class='small' @click=${this._handleCreatePacket} title='Create packet'>${PLUS_ICON}</button>
					<button class='small' @click=${this._handleDeletePacket} title='Delete packet'>${DELETE_FOREVER_ICON}</button>
					<label>Seeds</label>
					<select .value=${this.currentSeedID} @change=${this._handleCurrentSeedChanged}>
						${Object.keys(this.currentPacket.seeds).map(id => html`<option .value='${id}' .selected=${id == this.currentSeedID}>${id}</option>`)}
					</select>
					
				</div>
				<seed-editor .seed=${this.currentSeed}></seed-editor>
			</div>
			
		`;
	}

	get currentPacket() : SeedPacket {
		return this.packets[this.currentPacketName] || emptySeedPacket();
	}

	get currentSeed() : SeedData {
		return this.currentPacket.seeds[this.currentSeedID];
	}

	_handleCurrentPacketChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not select element');
		this.dispatchEvent(makeCurrentPacketChangedEvent(ele.value));
	}

	_handleCurrentSeedChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not select element');
		this.dispatchEvent(makeCurrentSeedIDChangedEvent(ele.value));
	}

	_handleCreatePacket() {
		this.dispatchEvent(makeCreatePacketEvent());
	}

	_handleDeletePacket() {
		this.dispatchEvent(makeDeletePacketEvent(this.currentPacketName));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
