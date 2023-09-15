import { html, css, TemplateResult} from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
	selectAllowEditing,
	selectCurrentPacket,
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeedID,
	selectEnvironment,
	selectEnvironmentData,
	selectGarden,
	selectHashForCurrentState,
	selectPacketsBundle,
	selectPageExtra,
	selectPrompter,
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
	EMPTY_PACKETS_BUNDLE,
	PacketName,
	PacketType,
	PacketsBundle,
	Prompter,
	WrappedPacket,
	packetType,
} from '../types.js';

import {
	RootState
} from '../types_store.js';

import {
	canonicalizeHash,
	canonicalizePath,
	updateHash,
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
	switchToPacket,
	deleteSeed,
	switchToSeed,
	forkPacket,
	importPacket,
	firstRunIfNecessary,
	setPacketCollapsed,
	switchToAdjacentSeed,
	collapseProperty,
	renameSeed
} from '../actions/data.js';

import {
	fetchEnvironmentFromStorage,
	fetchPacketsFromStorage,
	storeEnvironmentToStorage,
	storePacketBundleToStorage
} from '../util.js';

import {
	KeyboardActions,
	KeyboardShortcutsMap,
	executeKeyboardAction
} from '../keyboard.js';

import {
	CurrentPacketChangedEvent,
	DeletePacketEvent,
	EnvironmentChangedEvent,
	EnvironmentDeletedEvent,
	ForkPacketEvent,
	ImportPacketEvent,
	PacketCollapsedEvent,
	PropertyCollapsedEvent,
	PropertyChangedEvent,
	PropertyDeletedEvent,
	RunSeedEvent,
	SeedEvent,
	RenameSeedEvent
} from '../events.js';

import {
	EnvironmentData,
	SeedID
} from '../../src/types.js';

import {
	Garden
} from '../../src/garden.js';

import {
	showEditJSON
} from '../actions/dialog.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	Environment
} from '../../src/environment.js';

import {
	runCurrentSeed,
	runSeed
} from '../actions/garden.js';

import './packet-editor.js';
import './app-dialog.js';
import './run-dialog.js';

const shortcuts : KeyboardShortcutsMap = {
	grow: {
		key: 'Enter',
		command: true
	}
};

const keyDownCommands : KeyboardActions = [
	{
		shortcut: shortcuts.grow,
		action: () => store.dispatch(runCurrentSeed())
	},
	{
		shortcut: {
			key: 'ArrowDown'
		},
		action: () => store.dispatch(switchToAdjacentSeed(false))
	},
	{
		shortcut: {
			key: 'ArrowUp'
		},
		action: () => store.dispatch(switchToAdjacentSeed(true))
	}
];

@customElement('main-view')
class MainView extends connect(store)(PageViewElement) {

	@state()
		_pageExtra = '';

	@state()
		_hashForCurrentState = '';

	@state()
		_allowEditing = false;

	@state()
		_environmentData : EnvironmentData = {};

	@state()
		_environment? : Environment;

	@state()
		_packets : PacketsBundle = EMPTY_PACKETS_BUNDLE;

	@state()
		_garden? : Garden;

	@state()
		_prompter? : Prompter;

	@state()
		_currentPacketName : PacketName = '';

	@state()
		_currentPacketType : PacketType = 'local';
	
	@state()
		_currentSeedID : SeedID = '';

	@state()
		_currentPacket? : WrappedPacket;
	
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

				pre {
					margin-top: 0;
					margin-bottom: 0;
				}
			`
		];
	}

	override render() : TemplateResult {
		return html`
			<app-dialog></app-dialog>
			<run-dialog></run-dialog>
			<div class='container'>
				<packet-editor
					.packets=${this._packets}
					.allowEditing=${this._allowEditing}
					.garden=${this._garden}
					.prompter=${this._prompter}
					.currentPacketName=${this._currentPacketName}
					.currentPacketType=${this._currentPacketType}
					.currentSeedID=${this._currentSeedID}
					.environment=${this._environment}
					.shortcuts=${shortcuts}
					@current-packet-changed=${this._handleCurrentPacketChanged}
					@create-packet=${this._handleCreatePacket}
					@delete-packet=${this._handleDeletePacket}
					@fork-packet=${this._handleForkPacket}
					@collapse-packet=${this._handleCollapsePacket}
					@current-seed-changed=${this._handleCurrentSeedChanged}
					@create-seed=${this._handleCreateSeed}
					@delete-seed=${this._handleDeleteSeed}
					@rename-seed=${this._handleRenameSeed}
					@import-packet=${this._handleImportPacket}
					@property-collapsed=${this._handlePropertyCollapsed}
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
		this._hashForCurrentState = selectHashForCurrentState(state);
		this._allowEditing = selectAllowEditing(state);
		this._environmentData = selectEnvironmentData(state);
		this._environment = selectEnvironment(state);
		this._packets = selectPacketsBundle(state);
		this._garden = selectGarden(state);
		this._prompter = selectPrompter(state);
		this._currentPacketName = selectCurrentPacketName(state);
		this._currentPacketType = selectCurrentPacketType(state);
		this._currentSeedID = selectCurrentSeedID(state);
		this._currentPacket = selectCurrentPacket(state);
	}

	override firstUpdated() {
		store.dispatch(firstRunIfNecessary());
		for (const pType of TypedObject.keys(packetType.enum)) {
			store.dispatch(loadPackets(fetchPacketsFromStorage(pType), pType));
		}
		store.dispatch(loadEnvironment(fetchEnvironmentFromStorage()));

		window.addEventListener('keydown', e => this._handleKeyDown(e));

		store.dispatch(canonicalizePath());
		window.addEventListener('hashchange', () => this._handleHashChange());
		//We do this after packets have already been loaded from storage
		this._handleHashChange();
	}

	override updated(changedProps : Map<string, MainView[keyof MainView]>) {
		if (changedProps.has('_packets')) {
			storePacketBundleToStorage(this._packets);
		}
		if (changedProps.has('_hashForCurrentState')) {
			store.dispatch(canonicalizeHash());
		}
		if (changedProps.has('_environmentData')){
			storeEnvironmentToStorage(this._environmentData);
		}
	}

	_handleKeyDown(e : KeyboardEvent) {
		executeKeyboardAction(e, keyDownCommands);
	}

	_handleHashChange() {
		store.dispatch(updateHash(window.location.hash, true));
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

	_handleCollapsePacket(e : PacketCollapsedEvent) {
		store.dispatch(setPacketCollapsed(e.detail.name, e.detail.packetType, e.detail.collapsed));
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

	_handleRenameSeed(e : RenameSeedEvent) {
		store.dispatch(renameSeed(e.detail.packet, e.detail.oldName, e.detail.newName));
	}

	_handleImportPacket(e : ImportPacketEvent) {
		store.dispatch(importPacket(e.detail.location));
	}

	_handlePropertyCollapsed(e : PropertyCollapsedEvent) {
		store.dispatch(collapseProperty(e.detail.path, e.detail.collapsed));
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

}

declare global {
	interface HTMLElementTagNameMap {
		'main-view': MainView;
	}
}