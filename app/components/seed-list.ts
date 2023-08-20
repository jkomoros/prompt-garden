import { LitElement } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { html, TemplateResult} from 'lit';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
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
	
	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
		];
	}

	override render() : TemplateResult {
		return html`<div class='container'>
			${TypedObject.entries(this.packets).map(entry => this._controlForPacket(entry[0], entry[1]))}
		</div>`;
	}

	_controlForPacket(name : PacketName, packet : SeedPacket) : TemplateResult {
		//TODO: keep track of which details are opened
		return html`<details>
				<summary>${name}</summary>
				${Object.keys(packet.seeds).map(seedID => html`<div class='row'>${seedID}</div>`)}
		</details>`;
	}


}

declare global {
	interface HTMLElementTagNameMap {
		'seed-list': SeedList;
	}
}
