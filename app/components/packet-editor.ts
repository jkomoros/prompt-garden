import { LitElement, css } from 'lit';
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

import { Environment } from '../../src/environment.js';

import './seed-editor.js';
import './seed-list.js';
import './environment-editor.js';

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type: Object})
		packets : Packets = {};

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
						.currentSeedID=${this.currentSeedID}
					>
					</seed-list>
					<environment-editor
						.environment=${this.environment}
					>
					</environment-editor>
				</div>
				<seed-editor .seed=${this.currentSeed} .editable=${true}></seed-editor>
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
