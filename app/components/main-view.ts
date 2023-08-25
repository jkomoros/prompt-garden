import { html, css, TemplateResult} from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
	selectCurrentPacket,
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeedID,
	selectDialogKind,
	selectDialogMessage,
	selectDialogOpen,
	selectEnvironment,
	selectEnvironmentData,
	selectPackets,
	selectPageExtra,
} from '../selectors.js';

// We are lazy loading its reducer.
import data from '../reducers/data.js';
import dialog from '../reducers/dialog.js';
import garden from '../reducers/garden.js';
store.addReducers({
	data,
	dialog,
	garden
});

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	DialogKind,
	PacketName,
	PacketType,
	Packets,
	RootState,
} from '../types.js';

import {
	canonicalizePath,
} from '../actions/app.js';

import {
	changeEnvironmentProperty,
	changeProperty,
	createPacket,
	createNamedSeed,
	deleteEnvironmentProperty,
	deletePacket,
	deleteProperty,
	loadEnvironment,
	loadPackets,
	replacePacket,
	switchToPacket,
	deleteSeed,
	switchToSeed,
	forkPacket
} from '../actions/data.js';

import {
	fetchEnvironmentFromStorage,
	fetchPacketsFromStorage,
	storeEnvironmentToStorage,
	storePacketsToStorage
} from '../util.js';

import {
	CurrentPacketChangedEvent,
	DeletePacketEvent,
	EnvironmentChangedEvent,
	EnvironmentDeletedEvent,
	ForkPacketEvent,
	PropertyChangedEvent,
	PropertyDeletedEvent,
	RunSeedEvent,
	SeedEvent
} from '../events.js';

import {
	EnvironmentData,
	SeedID,
	SeedPacket,
	seedPacket
} from '../../src/types.js';

import {
	assertUnreachable
} from '../../src/util.js';

import {
	closeDialog,
	showEditJSON
} from '../actions/dialog.js';

import {
	CHECK_CIRCLE_OUTLINE_ICON,
	CANCEL_ICON
} from './my-icons.js';

import { Environment } from '../../src/environment.js';

import {
	runSeed
} from '../actions/garden.js';

import './packet-editor.js';
import './dialog-element.js';

@customElement('main-view')
class MainView extends connect(store)(PageViewElement) {

	@state()
		_pageExtra = '';

	@state()
		_environmentData : EnvironmentData = {};

	@state()
		_environment? : Environment;

	@state()
		_packets : Packets = {};

	@state()
		_currentPacketName : PacketName = '';

	@state()
		_currentPacketType : PacketType = 'local';
	
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

				.container {
					height: 100%;
					width: 100%;
				}

				packet-editor {
					height: 100%;
					width: 100%;
				}

				dialog-element .buttons {
					display: flex;
					justify-content: flex-end;
				}

				dialog-element textarea {
					flex: 1;
				}

				pre {
					margin-top: 0;
					margin-bottom: 0;
				}
			`
		];
	}

	override render() : TemplateResult {
		return html`
			<dialog-element
				.open=${this._dialogOpen}
				.title=${this._dialogTitle}
				@dialog-should-close=${this._handleDialogShouldClose}
				.hideClose=${true}>${this._dialogContent}
			>
			</dialog-element>
			<div class='container'>
				<packet-editor
					.packets=${this._packets}
					.currentPacketName=${this._currentPacketName}
					.currentPacketType=${this._currentPacketType}
					.currentSeedID=${this._currentSeedID}
					.environment=${this._environment}
					@current-packet-changed=${this._handleCurrentPacketChanged}
					@create-packet=${this._handleCreatePacket}
					@delete-packet=${this._handleDeletePacket}
					@fork-packet=${this._handleForkPacket}
					@current-seed-changed=${this._handleCurrentSeedChanged}
					@create-seed=${this._handleCreateSeed}
					@delete-seed=${this._handleDeleteSeed}
					@property-changed=${this._handlePropertyChanged}
					@property-deleted=${this._handlePropertyDeleted}
					@show-edit-json=${this._handleShowEditJSON}
					@run-seed=${this._handleRunSeed}
					@environment-changed=${this._handleEnvironmentChanged}
					@environment-deleted=${this._handleEnvironmentDeleted}
				>
				</packet-editor>
			</div>
		`;
	}

	// This is called every time something is updated in the store.
	override stateChanged(state : RootState) {
		this._pageExtra = selectPageExtra(state);
		this._environmentData = selectEnvironmentData(state);
		this._environment = selectEnvironment(state);
		this._packets = selectPackets(state);
		this._currentPacketName = selectCurrentPacketName(state);
		this._currentPacketType = selectCurrentPacketType(state);
		this._currentSeedID = selectCurrentSeedID(state);
		this._currentPacket = selectCurrentPacket(state);
		this._dialogKind = selectDialogKind(state);
		this._dialogMessage = selectDialogMessage(state);
		this._dialogOpen = selectDialogOpen(state);
	}

	override firstUpdated() {
		store.dispatch(canonicalizePath());
		store.dispatch(loadPackets(fetchPacketsFromStorage()));
		store.dispatch(loadEnvironment(fetchEnvironmentFromStorage()));
	}

	override updated(changedProps : Map<string, MainView[keyof MainView]>) {
		if (changedProps.has('_packets')) {
			storePacketsToStorage(this._packets);
		}
		if (changedProps.has('_environmentData')){
			storeEnvironmentToStorage(this._environmentData);
		}
	}

	_handleCurrentPacketChanged(e : CurrentPacketChangedEvent) {
		store.dispatch(switchToPacket(e.detail.name, e.detail.packetType));
	}

	_handleCreatePacket() {
		store.dispatch(createPacket());
	}

	_handleDeletePacket(e : DeletePacketEvent) {
		store.dispatch(deletePacket(e.detail.name, e.detail.packetType));
	}

	_handleForkPacket(e : ForkPacketEvent) {
		store.dispatch(forkPacket(e.detail.name, e.detail.packetType));
	}

	_handleCurrentSeedChanged(e : SeedEvent) {
		if (e.detail.action != 'select') throw new Error('Expected select');
		store.dispatch(switchToSeed(e.detail.packet, e.detail.packetType, e.detail.seed));
	}

	_handleCreateSeed(e : SeedEvent) {
		if (e.detail.action != 'create') throw new Error('Expected create');
		store.dispatch(createNamedSeed(e.detail.packet, e.detail.seed));
	}

	_handleDeleteSeed(e : SeedEvent) {
		if (e.detail.action != 'delete') throw new Error('Expected delete');
		store.dispatch(deleteSeed(e.detail.packet, e.detail.packetType, e.detail.seed));
	}

	_handlePropertyChanged(e : PropertyChangedEvent) {
		store.dispatch(changeProperty(e.detail.path, e.detail.newValue));
	}

	_handlePropertyDeleted(e : PropertyDeletedEvent) {
		store.dispatch(deleteProperty(e.detail.path));
	}

	_handleEnvironmentChanged(e : EnvironmentChangedEvent) {
		store.dispatch(changeEnvironmentProperty(e.detail.key, e.detail.value));
	}

	_handleEnvironmentDeleted(e : EnvironmentDeletedEvent) {
		store.dispatch(deleteEnvironmentProperty(e.detail.key));
	}

	_handleShowEditJSON() {
		store.dispatch(showEditJSON());
	}

	_handleRunSeed(e : RunSeedEvent) {
		store.dispatch(runSeed(e.detail, e.detail.packetType));
	}

	_handleDialogShouldClose() {
		store.dispatch(closeDialog());
	}

	_handleDialogCommit() {
		switch(this._dialogKind) {
		case 'edit-json':
			this.dialogEditJSONCommit();
			break;
		case 'error':
		case '':
			//The commit action is just to close.
			break;
		default:
			assertUnreachable(this._dialogKind);
		}
		this._handleDialogShouldClose();
	}

	dialogEditJSONCommit() {
		const root = this.shadowRoot;
		if (!root) throw new Error('no root');
		const textarea = root.querySelector('dialog-element textarea');
		if (!textarea) throw new Error('no textarea');
		//narrow types
		if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('not a textarea');
		const json = JSON.parse(textarea.value);
		const packet = seedPacket.parse(json);
		store.dispatch(replacePacket(this._currentPacketName, this._currentPacketType, packet));
	}

	_withButtons(inner : TemplateResult, includeCancel : boolean) : TemplateResult {
		return html`
			${inner}
			${includeCancel ? html`<button slot='buttons' class='round' @click=${this._handleDialogShouldClose}>${CANCEL_ICON}</button>` : ''}
			<button slot='buttons' class='round default' @click=${this._handleDialogCommit}>${CHECK_CIRCLE_OUTLINE_ICON}</button>
		`;
	}

	get _dialogContent() : TemplateResult {
		switch(this._dialogKind){
		case 'edit-json':
			return this._withButtons(this._dialogContentEditJSON, true);
		case 'error':
			return this._withButtons(html`${this._dialogMessage}`, false);
		case '':
			return this._withButtons(html`An unknown error has occurred.`, false);
		}
		assertUnreachable(this._dialogKind);
	}

	get _dialogContentEditJSON() : TemplateResult {
		const content = JSON.stringify(this._currentPacket, null, '\t');
		return html`<textarea .value=${content}></textarea>`;
	}

	get _dialogTitle() : string {
		switch(this._dialogKind) {
		case '':
		case 'error':
			return 'Error';
		case 'edit-json':
			return 'Packet \'' + this._currentPacketName + '\'';
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