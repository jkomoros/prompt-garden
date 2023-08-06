import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	PacketName,
	Packets
} from '../types.js';

import {
	makeCurrentPacketChangedEvent
} from '../events.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import { PLUS_ICON } from './my-icons.js';

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type: Object})
		packets : Packets = {};

	@property({type: String})
		currentPacket : PacketName = '';

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
					<select .value=${this.currentPacket} @change=${this._handleCurrentPacketChanged}>
						${Object.keys(this.packets).map(name => html`<option .value='${name}' .selected=${name == this.currentPacket}>${name}</option>`)}
					</select>
					<button class='small' @click=${this._handleCreatePacket} title='Create packet'>${PLUS_ICON}</button>
				</div>
				<pre>${JSON.stringify(this.packets[this.currentPacket], null, '\t')}</pre>
			</div>
			
		`;
	}

	_handleCurrentPacketChanged(e : Event) {
		const ele = e.composedPath()[0];
		if (!(ele instanceof HTMLSelectElement)) throw new Error('not select element');
		this.dispatchEvent(makeCurrentPacketChangedEvent(ele.value));
	}

	_handleCreatePacket() {
		//TODO
		console.log('TODO: acutally create packet');
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
