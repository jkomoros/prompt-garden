import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	PacketName,
	Packets
} from '../types.js';

@customElement('packet-editor')
export class PacketEditor extends LitElement {

	@property({type: Object})
		packets : Packets = {};

	@property({type: String})
		currentPacket : PacketName = '';

	override render() : TemplateResult {
		return html`
			<div class='container'>
				<div class='controls'>
					<select .value=${this.currentPacket} @change=${this._handleCurrentPacketChanged}>
						${Object.keys(this.packets).map(name => html`<option .value='${name}' .selected=${name == this.currentPacket}>${name}</option>`)}
					</select>
				</div>
				<pre>${JSON.stringify(this.packets, null, '\t')}</pre>
			</div>
			
		`;
	}

	_handleCurrentPacketChanged(e : Event) {
		//TODO: actually dispatch event.
		console.log('Changed: ', e);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'packet-editor': PacketEditor;
	}
}
