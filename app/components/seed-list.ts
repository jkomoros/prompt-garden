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
	SeedID
} from '../../src/types.js';

import {
	EMPTY_PACKETS_BUNDLE,
	EMPTY_SEED_SELECTOR,
	PacketName,
	PacketType,
	PacketsBundle,
	SeedSelector,
	WrappedPacket,
	packetType
} from '../types.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	makeCreatePacketEvent,
	makeCurrentPacketChangedEvent,
	makeCurrentSeedIDChangedEvent,
	makeDownloadAllPacketsEvent,
	makeImportPacketEvent,
	makePacketCollapsedEvent
} from '../events.js';

import {
	templateForSeedID
} from '../util.js';

@customElement('seed-list')
export class SeedList extends LitElement {

	@property({type:Object})
		packets: PacketsBundle = EMPTY_PACKETS_BUNDLE;

	@property({type: Object})
		currentSeedSelector : SeedSelector = EMPTY_SEED_SELECTOR;
	
	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			css`

				div.row {
					align-items: center;
				}

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
				<label>Local Packets</label>
				<button class='emoji' @click=${this._handleCreatePacket} title='Create packet'>➕</button>
				<button class='emoji' @click=${this._handleDownloadAllPackets} title='Download all packets as zip file'>💾</button>
			</div>
			${TypedObject.entries(this.packets.local).map(entry => this._controlForPacket(entry[0], 'local', entry[1]))}
			<div class='row'>
				<label>Remote Packets</label>
				<button class='emoji' @click=${this._handleImportPacket} title='Import remote packet'>📥</button>
			</div>
			${TypedObject.entries(this.packets.remote).map(entry => this._controlForPacket(entry[0], 'remote', entry[1]))}
		</div>`;
	}

	_controlForPacket(name : PacketName, packetType : PacketType, packet : WrappedPacket) : TemplateResult {
		const classes = {
			selected: name == this.currentSeedSelector.packetName
		};
		const collapsed = packet.collapsed.collapsed;
		const displayName = packet.displayName || name;
		return html`<details ?open=${!collapsed} class=${classMap(classes)} data-packet-name=${name} data-packet-type=${packetType}>
				<summary @click=${this._handleCollapsePacket}>
					<span @click=${this._handlePacketClicked}>${displayName}</span>
				</summary>
				${Object.keys(packet.data.seeds).map(seedID => this._controlForSeed(name, packetType, seedID))}
		</details>`;
	}

	_controlForSeed(packetName : PacketName, packetType : PacketType, seedID : SeedID) : TemplateResult {
		const classes = {
			row: true,
			seed: true,
			selected: packetName == this.currentSeedSelector.packetName && seedID == this.currentSeedSelector.seedID
		};
		return html`<div class=${classMap(classes)} data-seed-id=${seedID} data-packet-name=${packetName}>
			<span @click=${this._handleSeedClicked}>${templateForSeedID(seedID)}</span>
		</div>`;
	}

	_handleCreatePacket() {
		this.dispatchEvent(makeCreatePacketEvent());
	}

	_handleDownloadAllPackets() {
		this.dispatchEvent(makeDownloadAllPacketsEvent());
	}

	_handleImportPacket() {
		this.dispatchEvent(makeImportPacketEvent());
	}

	_handleCollapsePacket(e : MouseEvent) {

		//Don't open/close the details/summary, we'll do it manually via re-rendering
		e.stopPropagation();
		e.preventDefault();

		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		const open = this._getDetailsOpen(e);
		//We don't need to reverse open, because open is already opposite of collapsed.
		this.dispatchEvent(makePacketCollapsedEvent(packetName, packetType, open));
	}

	_getDetailsOpen(e : Event) : boolean {
		for (const ele of e.composedPath()) {
			if (!(ele instanceof HTMLDetailsElement)) continue;
			return ele.open;
		}
		throw new  Error('no details in ancestor chain');
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
			//a seedID of '' is valid
			if (ele.dataset.seedId != undefined) return ele.dataset.seedId;
		}
		throw new  Error('no seedID in ancestor chain');
	}

	_getPacketType(e : Event) : PacketType {
		for (const ele of e.composedPath()) {
			if (!(ele instanceof HTMLElement)) continue;
			if (ele.dataset.packetType) return packetType.parse(ele.dataset.packetType);
		}
		throw new  Error('no packet name in ancestor chain');
	}

	_handlePacketClicked(e : MouseEvent) {
		//Don't open/close the details/summary
		e.stopPropagation();
		e.preventDefault();

		const packetName = this._getPacketName(e);
		const packetType = this._getPacketType(e);
		this.dispatchEvent(makeCurrentPacketChangedEvent(packetName, packetType));
	}

	_handleSeedClicked(e : MouseEvent) {
		const seedID = this._getSeedID(e);
		const packetType = this._getPacketType(e);
		const packetName = this._getPacketName(e);
		this.dispatchEvent(makeCurrentSeedIDChangedEvent(packetName, packetType, seedID));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'seed-list': SeedList;
	}
}
