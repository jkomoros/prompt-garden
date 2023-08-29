import { LitElement, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	EMPTY_PACKETS_BUNDLE,
	PacketName,
	PacketType,
	PacketsBundle,
	WrappedPacket
} from '../types.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	SeedData,
	SeedID
} from '../../src/types.js';

import {
	emptyWrappedSeedPacket,
	getPacket,
	packetTypeEditable
} from '../util.js';

import {
	Environment
} from '../../src/environment.js';

import {
	ARROW_SPLIT_ICON,
	CODE_ICON
} from './my-icons.js';

import {
	makeForkPacketEvent,
	makeShowEditJSONEvent
} from '../events.js';


import './seed-editor.js';
import './seed-list.js';
import './environment-editor.js';

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type: Object})
		packets : PacketsBundle = EMPTY_PACKETS_BUNDLE;

	@property({type: String})
		currentPacketType : PacketType = 'local';

	@property({type: String})
		currentPacketName : PacketName = '';

	@property({type: String})
		currentSeedID: SeedID = '';

	@property({type : Object})
		environment? : Environment;

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			css`
				.container {
					height: 100%;
					width: 100%;
					display: flex;
					flex-direction: row;
				}

				.sidebar {
					min-width: 12em;
					display: flex;
					flex-direction: column;
					margin-right: 1em;
					border-right: var(--default-border);
				}

				seed-list {
					flex-grow: 1;
				}

				environment-editor {
					border-top: var(--default-border);
				}
			`
		];
	}

	override render() : TemplateResult {
		return html`
			<div class='container'>
				<div class='sidebar'>
					<seed-list
						.packets=${this.packets}
						.currentPacketName=${this.currentPacketName}
						.currentPacketType=${this.currentPacketType}
						.currentSeedID=${this.currentSeedID}
					>
					</seed-list>
					<environment-editor
						.environment=${this.environment}
					>
					</environment-editor>
				</div>
				<div class='main'>
					<div class='toolbar'>
						<label>Packet</label>
						<span>${this.packetDisplayName}</span>
						<button class='small' @click=${this._handleShowEditJSON} title='Edit JSON'>${CODE_ICON}</button>
						<button class='small' @click=${this._handleForkPacket} title='Fork packet'>${ARROW_SPLIT_ICON}</button>
						<label>Seed</label>
						<span>${this.currentSeedID}</span>
					</div>
					<seed-editor .seed=${this.currentSeed} .editable=${packetTypeEditable(this.currentPacketType)}></seed-editor>
				</div>
			</div>
			
		`;
	}
	
	get packetDisplayName() : string {
		return this.currentPacket.displayName || this.currentPacketName;
	}

	get currentPacket() : WrappedPacket {
		return getPacket(this.packets, this.currentPacketName, this.currentPacketType) || emptyWrappedSeedPacket();
	}

	get currentSeed() : SeedData {
		return this.currentPacket.data.seeds[this.currentSeedID];
	}

	_handleForkPacket() {
		this.dispatchEvent(makeForkPacketEvent(this.currentPacketName, this.currentPacketType));
	}

	_handleShowEditJSON() {
		//TODO: this shows for the current packet... which is currently OK
		//because we hide the button unless the packet it selected.
		this.dispatchEvent(makeShowEditJSONEvent());
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
