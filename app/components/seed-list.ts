import { LitElement, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { html, TemplateResult} from 'lit';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	SeedID,
	SeedPacket
} from '../../src/types.js';

import {
	PacketName,
	Packets
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

@customElement('seed-list')
export class SeedList extends LitElement {

	@property({type:Object})
		packets: Packets = {};

	@property({type: String})
		currentPacketName: PacketName = '';
	
	@property({type: String})
		currentSeedID: SeedID = '';
	
	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			css`
				.selected {
					font-weight: bold;
				}
			`
		];
	}

	override render() : TemplateResult {
		return html`<div class='container'>
			${TypedObject.entries(this.packets).map(entry => this._controlForPacket(entry[0], entry[1]))}
		</div>`;
	}

	_controlForPacket(name : PacketName, packet : SeedPacket) : TemplateResult {
		//TODO: keep track of which details are opened
		const classes = {
			selected: name == this.currentPacketName
		};
		return html`<details open>
				<summary class=${classMap(classes)}>${name}</summary>
				${Object.keys(packet.seeds).map(seedID => this._controlForSeed(name, seedID))}
		</details>`;
	}

	_controlForSeed(packetName : PacketName, seedID : SeedID) : TemplateResult {
		const classes = {
			selected: packetName == this.currentPacketName && seedID == this.currentSeedID
		};
		return html`<div class=${classMap(classes)}>${seedID}</div>`;
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'seed-list': SeedList;
	}
}
