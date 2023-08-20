import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	PacketName,
	Packets
} from '../types.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

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
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
