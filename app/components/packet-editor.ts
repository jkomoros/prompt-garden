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

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type: Object})
		packets : Packets = {};

	@property({type: String})
		currentPacketName : PacketName = '';

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
					<select .value=${this.currentPacketName} @change=${this._handleCurrentPacketChanged}>
						${Object.keys(this.packets).map(name => html`<option .value='${name}' .selected=${name == this.currentPacketName}>${name}</option>`)}
					</select>
					<button class='small' @click=${this._handleCreatePacket} title='Create packet'>${PLUS_ICON}</button>
					<button class='small' @click=${this._handleDeletePacket} title='Delete packet'>${DELETE_FOREVER_ICON}</button>
				</div>
				<pre>${JSON.stringify(this.packets[this.currentPacketName], null, '\t')}</pre>
			</div>
			
		`;
	}

	_handleCurrentPacketChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not select element');
		this.dispatchEvent(makeCurrentPacketChangedEvent(ele.value));
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
