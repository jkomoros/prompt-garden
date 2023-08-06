import { html, css, TemplateResult} from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
	selectCurrentPacket,
	selectPackets,
	selectPageExtra,
} from '../selectors.js';

// We are lazy loading its reducer.
import data from '../reducers/data.js';
store.addReducers({
	data,
});

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	PacketName,
	Packets,
	RootState,
} from '../types.js';

import {
	canonicalizePath,
} from '../actions/app.js';

import {
	loadPackets, switchToPacket
} from '../actions/data.js';

import {
	fetchPacketsFromStorage,
	storePacketsToStorage
} from '../util.js';

import {
	CurrentPacketChangedEvent
} from '../events.js';

import './packet-editor.js';

@customElement('main-view')
class MainView extends connect(store)(PageViewElement) {

	@state()
		_pageExtra = '';

	@state()
		_packets : Packets = {};

	@state()
		_currentPacket : PacketName = '';

	static override get styles() {
		return [
			SharedStyles,
			ButtonSharedStyles,
			css`
				:host {
					position:relative;
					height:100vh;
					width: 100vw;
					background-color: var(--override-app-background-color, var(--app-background-color, #356F9E));
					overflow:scroll;
					--stroke-width: 0px;
				}

				adjacency-map-controls {
					position: absolute;
					top: 0;
					left: 0;
					padding: 1em;
					box-sizing: border-box;
					border: 1px solid var(--dark-gray-color);
					width: var(--controls-width);
				}

				adjacency-map-diagram {
					display: flex;
					justify-content: center;
					align-items: center;
				}

				dialog-element .buttons {
					display: flex;
					justify-content: flex-end;
				}

				pre {
					margin-top: 0;
					margin-bottom: 0;
				}

				pre.noselect {
					user-select: none;
				}

				.instructions {
					user-select: none;
				}
			`
		];
	}

	override render() : TemplateResult {
		return html`
			<div class='container'>
				<packet-editor .packets=${this._packets} .currentPacket=${this._currentPacket} @current-packet-changed=${this._handleCurrentPacketChanged}></packet-editor>
			</div>
		`;
	}

	// This is called every time something is updated in the store.
	override stateChanged(state : RootState) {
		this._pageExtra = selectPageExtra(state);
		this._packets = selectPackets(state);
		this._currentPacket = selectCurrentPacket(state);
	}

	override firstUpdated() {
		store.dispatch(canonicalizePath());
		store.dispatch(loadPackets(fetchPacketsFromStorage()));
	}

	override updated(changedProps : Map<string, MainView[keyof MainView]>) {
		if (changedProps.has('_packets')) {
			storePacketsToStorage(this._packets);
		}
	}

	_handleCurrentPacketChanged(e : CurrentPacketChangedEvent) {
		store.dispatch(switchToPacket(e.detail.name));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'main-view': MainView;
	}
}