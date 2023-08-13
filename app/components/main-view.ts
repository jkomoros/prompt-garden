import { html, css, TemplateResult} from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
	selectCurrentPacket,
	selectCurrentPacketName,
	selectCurrentSeedID,
	selectDialogKind,
	selectDialogMessage,
	selectDialogOpen,
	selectPackets,
	selectPageExtra,
} from '../selectors.js';

// We are lazy loading its reducer.
import data from '../reducers/data.js';
import dialog from '../reducers/dialog.js';
store.addReducers({
	data,
	dialog
});

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	DialogKind,
	PacketName,
	Packets,
	RootState,
} from '../types.js';

import {
	canonicalizePath,
} from '../actions/app.js';

import {
	changeProperty,
	createPacket,
	deletePacket,
	loadPackets,
	switchToPacket,
	switchToSeed
} from '../actions/data.js';

import {
	fetchPacketsFromStorage,
	storePacketsToStorage
} from '../util.js';

import {
	CurrentPacketChangedEvent,
	CurrentSeedIDChangedEvent,
	DeletePacketEvent,
	PropertyChangedEvent
} from '../events.js';

import {
	SeedID,
	SeedPacket
} from '../../src/types.js';

import {
	assertUnreachable
} from '../../src/util.js';

import {
	closeDialog, showReadout
} from '../actions/dialog.js';

import {
	CHECK_CIRCLE_OUTLINE_ICON
} from './my-icons.js';

import './packet-editor.js';

@customElement('main-view')
class MainView extends connect(store)(PageViewElement) {

	@state()
		_pageExtra = '';

	@state()
		_packets : Packets = {};

	@state()
		_currentPacketName : PacketName = '';
	
	@state()
		_currentSeedID : SeedID = '';

	@state()
		_currentPacket? : SeedPacket;
	
	@state()
		_dialogOpen = false;
	
	@state()
		_dialogKind : DialogKind = '';
	
	@state()
		_dialogMessage = '';

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
			<dialog-element .open=${this._dialogOpen} .title=${this._dialogTitle} @dialog-should-close=${this._handleDialogShouldClose} .hideClose=${true}>${this._dialogContent}</dialog-element>
			<div class='container'>
				<packet-editor .packets=${this._packets} .currentPacketName=${this._currentPacketName} .currentSeedID=${this._currentSeedID} @current-packet-changed=${this._handleCurrentPacketChanged} @create-packet=${this._handleCreatePacket} @delete-packet=${this._handleDeletePacket} @current-seed-changed=${this._handleCurrentSeedChanged} @property-changed=${this._handlePropertyChanged} @show-readout=${this._handleShowReadout}></packet-editor>
			</div>
		`;
	}

	// This is called every time something is updated in the store.
	override stateChanged(state : RootState) {
		this._pageExtra = selectPageExtra(state);
		this._packets = selectPackets(state);
		this._currentPacketName = selectCurrentPacketName(state);
		this._currentSeedID = selectCurrentSeedID(state);
		this._currentPacket = selectCurrentPacket(state);
		this._dialogKind = selectDialogKind(state);
		this._dialogMessage = selectDialogMessage(state);
		this._dialogOpen = selectDialogOpen(state);
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

	_handleCreatePacket() {
		store.dispatch(createPacket());
	}

	_handleDeletePacket(e : DeletePacketEvent) {
		store.dispatch(deletePacket(e.detail.name));
	}

	_handleCurrentSeedChanged(e : CurrentSeedIDChangedEvent) {
		store.dispatch(switchToSeed(e.detail.seed));
	}

	_handlePropertyChanged(e : PropertyChangedEvent) {
		store.dispatch(changeProperty(e.detail.path, e.detail.newValue));
	}

	_handleShowReadout() {
		store.dispatch(showReadout());
	}

	_handleDialogShouldClose() {
		store.dispatch(closeDialog());
	}

	_withButtons(inner : TemplateResult) : TemplateResult {
		return html`
			${inner}
			<button slot='buttons' class='round' @click=${this._handleDialogShouldClose}>${CHECK_CIRCLE_OUTLINE_ICON}</button>
		`;
	}

	get _dialogContent() : TemplateResult {
		switch(this._dialogKind){
		case 'readout':
			return this._withButtons(this._dialogContentReadout);
		case 'error':
			return this._withButtons(html`${this._dialogMessage}`);
		case '':
			return this._withButtons(html`An unknown error has occurred.`);
		}
		assertUnreachable(this._dialogKind);
	}

	get _dialogContentReadout() : TemplateResult {
		const content = JSON.stringify(this._currentPacket, null, '\t');
		return html`<textarea>${content}</textarea>`;
	}

	get _dialogTitle() : string {
		switch(this._dialogKind) {
		case '':
		case 'error':
			return 'Error';
		case 'readout':
			return 'Data';
		default:
			return assertUnreachable(this._dialogKind);
		}
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'main-view': MainView;
	}
}