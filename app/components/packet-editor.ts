import { LitElement, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	z
} from 'zod';

import {
	EMPTY_PACKETS_BUNDLE,
	PacketName,
	PacketType,
	PacketsBundle,
	Prompter,
	WrappedPacket
} from '../types.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	SeedDataIsh,
	SeedID
} from '../../src/types.js';

import {
	Garden
} from '../../src/garden.js';

import {
	emptyWrappedSeedPacket,
	getPacket,
	packetTypeEditable,
	templateForSeedID
} from '../util.js';

import {
	Environment
} from '../../src/environment.js';

import {
	makeCreateSeedIDEvent,
	makeDeletePacketEvent,
	makeDeleteSeedIDEvent,
	makeDownloadPacketEvent,
	makeForkPacketEvent,
	makeImportPacketEvent,
	makeRenameSeedIDEvent,
	makeRunSeedEvent,
	makeShowEditJSONEvent
} from '../events.js';

import {
	keyboardShortcut, shortcutDisplayString
} from '../keyboard.js';

import './seed-editor.js';
import './seed-list.js';
import './environment-editor.js';

const shortcutMap = z.object({
	grow: keyboardShortcut
}).partial();

type ShortcutMap = z.infer<typeof shortcutMap>;

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type : Boolean})
		allowEditing = false;

	@property({type: Object})
		packets : PacketsBundle = EMPTY_PACKETS_BUNDLE;

	@property({type: Object})
		garden? : Garden;

	@property({type: Object})
		prompter? : Prompter;

	@property({type: String})
		currentPacketType : PacketType = 'local';

	@property({type: String})
		currentPacketName : PacketName = '';

	@property({type: String})
		currentSeedID: SeedID = '';

	@property({type : Object})
		environment? : Environment;

	//Shortcuts is a way for the parent context to tell us which keyboard
	//shortcuts our parent are listening for, so we can render hints in the UI for them.
	@property({type: Object})
		shortcuts : ShortcutMap = {};

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
		const readonly = !packetTypeEditable(this.currentPacketType) || !this.allowEditing;
		const remote = this.currentPacketType == 'remote';
		const growShortcutString = shortcutDisplayString(this.shortcuts.grow);
		const collapsed = this.currentPacket.collapsed.seeds[this.currentSeedID];
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
						.prompter=${this.prompter}
					>
					</environment-editor>
				</div>
				<div class='main'>
					<div class='toolbar'>
						<label>Packet</label>
						<span>${this.packetDisplayName}</span>
						<button
							class='emoji'
							?disabled=${readonly}
							@click=${this._handleCreateSeed}
							title=${'Create Seed' + (readonly ? ' - Disabled for remote packets' : '')}
						>
							➕
						</button>
						<button class='emoji' @click=${this._handleShowEditJSON} title='Edit JSON'>💻</button>
						<button class='emoji' @click=${this._handleForkPacket} title='Fork packet'>📋</button>
						<button class='emoji' @click=${this._handleDeletePacket} title='Delete packet'>🗑️</button>
						<button class='emoji' @click=${this._handleDownloadPacket} title='Download packet'>💾</button>
						<button
							class='emoji'
							@click=${this._handleRefreshPacket}
							.title=${remote ? 'Re-fetch remote packet' : 'Re-fetching packets is only allowed for remote packets'}
							?disabled=${!remote}
						>
						🔁
						</button>
						<label>Seed</label>
						<span>${templateForSeedID(this.currentSeedID)}</span>
						<button
							class='emoji'
							?disabled=${readonly}
							@click=${this._handleRenameSeed}
							title=${'Rename seed' + (readonly ? ' - Disabled for remote packets' : '')}
						>✏️</button>
						<button
							class='emoji'
							?disabled=${readonly}
							@click=${this._handleDeleteSeed}
							title=${'Delete Seed' + (readonly ? ' - Disabled for remote packets' : '')}
						>
						🗑️
						</button>
						<button
							class='emoji'
							?disabled=${!this.garden}
							@click=${this._handleRunClicked}
							title=${'Grow Seed' + (growShortcutString ? ' - ' + growShortcutString : '') + (!this.garden ? ' - Disabled because seed definition has errors' : '')}
						>
						🌱
						</button>
					</div>
					<seed-editor
						.seed=${this.currentSeed}
						.collapsed=${collapsed}
						.editable=${!readonly}
						.prompter=${this.prompter}
					>
					</seed-editor>
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

	get currentSeed() : SeedDataIsh {
		return this.currentPacket.data.seeds[this.currentSeedID];
	}

	_handleCreateSeed() {
		const name = prompt('What should the seed be called?');
		if (!name) throw new Error('No name');
		this.dispatchEvent(makeCreateSeedIDEvent(this.currentPacketName, this.currentPacketType, name));
	}

	_handleRenameSeed() {
		const oldName = this.currentSeedID;
		const newName = prompt('Whould should the new name be?', oldName);
		if (newName === null) throw new Error('User cancelled');
		if (oldName == newName) throw new Error('Name did not change');
		this.dispatchEvent(makeRenameSeedIDEvent(this.currentPacketName, this.currentSeedID, newName));
	}

	_handleDeleteSeed() {
		this.dispatchEvent(makeDeleteSeedIDEvent(this.currentPacketName, this.currentPacketType, this.currentSeedID));
	}

	_handleForkPacket() {
		this.dispatchEvent(makeForkPacketEvent(this.currentPacketName, this.currentPacketType));
	}

	_handleDeletePacket() {
		this.dispatchEvent(makeDeletePacketEvent(this.currentPacketName, this.currentPacketType));
	}

	_handleDownloadPacket() {
		this.dispatchEvent(makeDownloadPacketEvent(this.currentPacketName, this.currentPacketType));
	}

	_handleRefreshPacket() {
		if (this.currentPacketType != 'remote') throw new Error('Refresh only allowed on remote packets');
		this.dispatchEvent(makeImportPacketEvent(this.currentPacketName));
	}

	_handleShowEditJSON() {
		//TODO: this shows for the current packet... which is currently OK
		//because we hide the button unless the packet it selected.
		this.dispatchEvent(makeShowEditJSONEvent());
	}

	_handleRunClicked() {
		this.dispatchEvent(makeRunSeedEvent(this.currentPacketName, this.currentPacketType, this.currentSeedID));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
