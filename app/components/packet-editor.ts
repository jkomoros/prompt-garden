import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	PacketName,
	Packets
} from '../types.js';

import {
	makeCreateSeedIDEvent,
	makeCurrentPacketChangedEvent,
	makeCurrentSeedIDChangedEvent,
	makeDeleteSeedIDEvent,
	makeRunSeedEvent,
	makeShowEditJSONEvent
} from '../events.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	CODE_ICON,
	DELETE_FOREVER_ICON,
	PLAY_ICON,
	PLUS_ICON
} from './my-icons.js';

import {
	SeedData,
	SeedID,
	SeedPacket,
	emptySeedPacket
} from '../../src/types.js';

import './seed-editor.js';
import './seed-list.js';

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
					<label>Seeds</label>
					<select .value=${this.currentSeedID} @change=${this._handleCurrentSeedChanged}>
						${Object.keys(this.currentPacket.seeds).map(id => html`<option .value='${id}' .selected=${id == this.currentSeedID}>${id}</option>`)}
					</select>
					<button class='small' @click=${this._handleCreateSeed} title='Create Seed'>${PLUS_ICON}</button>
					<button class='small' @click=${this._handleDeleteSeed} title='Delete Seed'>${DELETE_FOREVER_ICON}</button>
					<button class='small' @click=${this._handleShowEditJSON} title='Edit JSON'>${CODE_ICON}</button>
					<button class='small' @click=${this._handleRunClicked} title='Run Seed'>${PLAY_ICON}</button>
				</div>
				<div class='row'>
					<seed-list .packets=${this.packets} .currentPacketName=${this.currentPacketName} .currentSeedID=${this.currentSeedID}></seed-list>
					<seed-editor .seed=${this.currentSeed} .editable=${true}></seed-editor>
				</div>
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
		this.dispatchEvent(makeCurrentSeedIDChangedEvent(this.currentPacketName, ele.value));
	}

	_handleShowEditJSON() {
		this.dispatchEvent(makeShowEditJSONEvent());
	}

	_handleRunClicked() {
		this.dispatchEvent(makeRunSeedEvent(this.currentPacketName, this.currentSeedID));
	}

	_handleCreateSeed() {
		const name = prompt('What should the seed be called?');
		if (!name) throw new Error('No name');
		this.dispatchEvent(makeCreateSeedIDEvent(this.currentPacketName, name));
	}

	_handleDeleteSeed() {
		this.dispatchEvent(makeDeleteSeedIDEvent(this.currentPacketName, this.currentSeedID));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
