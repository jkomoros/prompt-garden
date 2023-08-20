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
import { makeCurrentSeedIDChangedEvent, makeDeletePacketEvent } from '../events.js';
import { DELETE_FOREVER_ICON } from './my-icons.js';

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

				summary span {
					cursor: pointer;
				}

				.seed {
					cursor: pointer;
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
				<summary class=${classMap(classes)} data-packet-name=${name}>
					<span>${name}</span>
					<button class='small' @click=${this._handleDeletePacket} title='Delete packet'>${DELETE_FOREVER_ICON}</button>
				</summary>
				${Object.keys(packet.seeds).map(seedID => this._controlForSeed(name, seedID))}
		</details>`;
	}

	_controlForSeed(packetName : PacketName, seedID : SeedID) : TemplateResult {
		const classes = {
			row: true,
			seed: true,
			selected: packetName == this.currentPacketName && seedID == this.currentSeedID
		};
		return html`<div class=${classMap(classes)} @click=${this._handleSeedClicked} data-seed-id=${seedID} data-packet-name=${packetName}>${seedID}</div>`;
	}

	_handleDeletePacket(e : MouseEvent) {
		let packetName : PacketName = '';
		for (const ele of e.composedPath()) {
			if (!(ele instanceof HTMLElement)) continue;
			if (!ele.dataset.packetName) continue;
			packetName = ele.dataset.packetName;
			break;
		}
		if (!packetName) throw new  Error('no packet name in ancestor chain');
		this.dispatchEvent(makeDeletePacketEvent(packetName));
	}

	_handleSeedClicked(e : MouseEvent) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLDivElement)) throw new Error('Not div like expected');
		const seedID = ele.dataset.seedId;
		const packetName = ele.dataset.packetName;
		if (!seedID || !packetName) throw new Error('missing seedID or packetName');
		this.dispatchEvent(makeCurrentSeedIDChangedEvent(packetName, seedID));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-list': SeedList;
	}
}
