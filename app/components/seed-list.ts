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
	PacketType,
	Packets
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	makeCreatePacketEvent,
	makeCreateSeedIDEvent,
	makeCurrentSeedIDChangedEvent,
	makeDeletePacketEvent,
	makeDeleteSeedIDEvent,
	makeForkPacketEvent,
	makeRunSeedEvent,
	makeShowEditJSONEvent
} from '../events.js';

import {
	ARROW_SPLIT_ICON,
	CODE_ICON,
	DELETE_FOREVER_ICON,
	PLAY_ICON,
	PLUS_ICON
} from './my-icons.js';

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

				/* only show buttons on selected seeds/packets */
				summary button, .seed button {
					display: none;
				}

				.selected > button, .selected > summary > button {
					display: initial;
				}

				.selected {
					background-color: var(--disabled-color);
				}

				.selected summary, .seed.selected {
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
			<div class='row'>
				<label>Packets</label>
			</div>
			${TypedObject.entries(this.packets).map(entry => this._controlForPacket(entry[0], entry[1]))}
			<div class='controls row'>
				<button class='small' @click=${this._handleCreatePacket} title='Create packet'>${PLUS_ICON}</button>
			</div>
		</div>`;
	}

	_controlForPacket(name : PacketName, packet : SeedPacket) : TemplateResult {
		//TODO: keep track of which details are opened in state
		const classes = {
			selected: name == this.currentPacketName
		};
		return html`<details open class=${classMap(classes)} data-packet-name=${name}>
				<summary>
					<span>${name}</span>
					<button class='small' @click=${this._handleCreateSeed} title='Create Seed'>${PLUS_ICON}</button>
					<button class='small' @click=${this._handleDeletePacket} title='Delete packet'>${DELETE_FOREVER_ICON}</button>
					<button class='small' @click=${this._handleForkPacket} title='Fork packet'>${ARROW_SPLIT_ICON}</button>
					<button class='small' @click=${this._handleShowEditJSON} title='Edit JSON'>${CODE_ICON}</button>
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
		return html`<div class=${classMap(classes)} data-seed-id=${seedID} data-packet-name=${packetName}>
			<span @click=${this._handleSeedClicked}>${seedID}</span>
			<button class='small' @click=${this._handleRunClicked} title='Run Seed'>${PLAY_ICON}</button>
			<button class='small' @click=${this._handleDeleteSeed} title='Delete Seed'>${DELETE_FOREVER_ICON}</button>
		</div>`;
	}

	_handleCreatePacket() {
		this.dispatchEvent(makeCreatePacketEvent());
	}

	_getPacketName(e : Event) : PacketName {
		for (const ele of e.composedPath()) {
			if (!(ele instanceof HTMLElement)) continue;
			if (ele.dataset.packetName) return ele.dataset.packetName;
		}
		throw new  Error('no packet name in ancestor chain');
	}

	_getSeedID(e : Event) : SeedID {
		for (const ele of e.composedPath()) {
			if (!(ele instanceof HTMLElement)) continue;
			if (ele.dataset.seedId) return ele.dataset.seedId;
		}
		throw new  Error('no seedID in ancestor chain');
	}

	_getPacketType(_ : Event) : PacketType {
		//TODO: when there are remotes, return through here.
		return 'local';
	}

	_handleDeletePacket(e : MouseEvent) {
		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		this.dispatchEvent(makeDeletePacketEvent(packetName, packetType));
	}

	_handleForkPacket(e : MouseEvent) {
		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		this.dispatchEvent(makeForkPacketEvent(packetName, packetType));
	}

	_handleCreateSeed(e : MouseEvent) {
		const name = prompt('What should the seed be called?');
		if (!name) throw new Error('No name');
		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		this.dispatchEvent(makeCreateSeedIDEvent(packetName, packetType, name));
	}

	_handleSeedClicked(e : MouseEvent) {
		const seedID = this._getSeedID(e);
		const packetType = this._getPacketType(e);
		const packetName = this._getPacketName(e);
		this.dispatchEvent(makeCurrentSeedIDChangedEvent(packetName, packetType, seedID));
	}

	_handleDeleteSeed(e : MouseEvent) {
		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		const seedID = this._getSeedID(e);
		this.dispatchEvent(makeDeleteSeedIDEvent(packetName, packetType, seedID));
	}

	_handleRunClicked(e : MouseEvent) {
		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		const seedID = this._getSeedID(e);
		this.dispatchEvent(makeRunSeedEvent(packetName, packetType, seedID));
	}

	_handleShowEditJSON() {
		//TODO: this shows for the current packet... which is currently OK
		//because we hide the button unless the packet it selected.
		this.dispatchEvent(makeShowEditJSONEvent());
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-list': SeedList;
	}
}
