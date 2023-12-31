import { css, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
	DialogElement
} from './dialog-element.js';

import {
	DialogKind,
	RootState
} from '../types_store.js';

import {
	selectCurrentPacket,
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectDialogChoices,
	selectDialogDefaultValue,
	selectDialogKind,
	selectDialogMessage,
	selectDialogOpen,
	selectDialogTitle,
	selectPrompter
} from '../selectors.js';

import {
	PacketName,
	PacketType,
	Prompter,
	WrappedPacket
} from '../types.js';

import {
	assertUnreachable
} from '../../src/util.js';

import {
	CANCEL_ICON,
	CHECK_CIRCLE_OUTLINE_ICON
} from './my-icons.js';

import {
	closeDialog
} from '../actions/dialog.js';

import {
	replacePacket
} from '../actions/data.js';

import {
	Choice,
	seedPacket
} from '../../src/types.js';

import {
	makeChoicesFullyDetailed
} from '../../src/meta.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

@customElement('app-dialog')
export class AppDialog extends connect(store)(DialogElement) {
	
	@state()
		_dialogKind : DialogKind = '';
	
	@state()
		_dialogMessage = '';

	@state()
		_dialogTitle = '';

	@state()
		_dialogDefaultValue = '';

	@state()
		_dialogChoices? : Choice[];

	@state()
		_prompter? : Prompter;

	@state()
		_currentPacketName : PacketName = '';
	
	@state()
		_currentPacketType : PacketType = 'local';
	
	@state()
		_currentPacket? : WrappedPacket;
	
	constructor() {
		super();
		this.hideClose = true;
	}

	static override get styles() {
		return [
			...DialogElement.styles,
			SharedStyles,
			ButtonSharedStyles,
			css`
				.buttons {
					display: flex;
					justify-content: flex-end;
				}

				textarea {
					flex: 1;
				}
			`
		];
	}

	override stateChanged(state : RootState) {
		//TODO: remove _dialog prefix from all
		this._dialogKind = selectDialogKind(state);
		this._dialogMessage = selectDialogMessage(state);
		this._dialogTitle = selectDialogTitle(state);
		this._dialogDefaultValue = selectDialogDefaultValue(state);
		this._dialogChoices = selectDialogChoices(state);

		this._currentPacketName = selectCurrentPacketName(state);
		this._currentPacketType = selectCurrentPacketType(state);
		this._currentPacket = selectCurrentPacket(state);

		this._prompter = selectPrompter(state);

		this.open = selectDialogOpen(state);
		this.title = this._dialogTitleString;
	}

	closeDialog() {
		store.dispatch(closeDialog());
	}

	_handleDialogCancelled() {
		switch(this._dialogKind) {
		case 'prompt':
			this.dialogPromptCancel();
			break;
		case 'confirm':
			this.dialogConfirmResult(false);
			break;
		case 'edit-json':
		case 'error':
		case 'info':
		case '':
			break;
		default:
			assertUnreachable(this._dialogKind);
		}
	}

	override commit() {
		switch(this._dialogKind) {
		case 'edit-json':
			this.dialogEditJSONCommit();
			break;
		case 'prompt':
			this.dialogPromptCommit();
			break;
		case 'confirm':
			this.dialogConfirmResult(true);
			break;
		case 'error':
		case 'info':
		case '':
			//The commit action is just to close.
			break;
		default:
			assertUnreachable(this._dialogKind);
		}
		this.closeDialog();
	}

	dialogPromptCommit() {
		const root = this.shadowRoot;
		if (!root) throw new Error('no root');
		let value = '';
		if (this._dialogChoices) {
			const select = root.querySelector('select');
			if (!select) throw new Error('no select as expected');
			if (!(select instanceof HTMLSelectElement)) throw new Error('Not a select');
			value = select.value;
		} else {
			const input = root.querySelector('input');
			if (!input) throw new Error('no input as expected');
			if (!(input instanceof HTMLInputElement)) throw new Error('Not a input');
			value = input.value;
		}
		if (!this._prompter) throw new Error('No prompter');
		this._prompter.providePromptResult(value);
	}

	dialogConfirmResult(result : boolean) {
		if (!this._prompter) throw new Error('No prompter');
		this._prompter.provideConfirmResult(result);
	}

	dialogPromptCancel() {
		if (!this._prompter) throw new Error('No prompter');
		this._prompter.providePromptFailure();
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

	get includeCancel() : boolean {
		switch(this._dialogKind){
		case 'edit-json':
		case 'prompt':
		case 'confirm':
			return true;
		case 'error':
		case 'info':
		case '':
			return false;
		}
		assertUnreachable(this._dialogKind);
	}

	_lineBreaks(content : string) : TemplateResult {
		return html`
			${content.split('\n').map((line, index, arr) => html`
			${line}${index < arr.length - 1 ? html`<br/>` : ''}
			`)}
		`;
	}

	override innerRender() : TemplateResult {
		switch(this._dialogKind){
		case 'edit-json':
			return this._dialogContentEditJSON;
		case 'prompt':
			return this._dialogContentPrompt;
		case 'error':
		case 'info':
		case 'confirm':
			return this._lineBreaks(this._dialogMessage);
		case '':
			return html`An unknown error has occurred.`;
		}
		assertUnreachable(this._dialogKind);
	}

	get _dialogContentPrompt() : TemplateResult {
		return html`<h2>${this._dialogMessage}</h2>
		${this._dialogChoices ? html`<select>
			${makeChoicesFullyDetailed(this._dialogChoices).map(choice => html`<option .value=${choice.value} .title=${choice.description} .selected=${choice.value == this._dialogDefaultValue}>${choice.display}</option>`)}
		</select>` :
		html`<input type='text' .value=${this._dialogDefaultValue}></input>`}
		`;
	}

	get _dialogContentEditJSON() : TemplateResult {
		const packet = this._currentPacket;
		const data = packet ? packet.data : {};
		const content = JSON.stringify(data, null, '\t');
		return html`<textarea .value=${content}></textarea>`;
	}

	get _dialogTitleString() : string {
		switch(this._dialogKind) {
		case '':
		case 'error':
			return 'Error';
		case 'info':
			return this._dialogTitle || 'Alert';
		case 'edit-json':
			return 'Packet \'' + this._currentPacketName + '\'';
		case 'prompt':
			return 'Question';
		case 'confirm':
			return 'Confirm';
		default:
			return assertUnreachable(this._dialogKind);
		}
	}

	override _shouldClose(cancelled : boolean) {
		if (cancelled) {
			this._handleDialogCancelled();
		}
		this.closeDialog();
	}

	override buttonsRender() : TemplateResult {
		const includeCancel = this.includeCancel;
		return html`
		${includeCancel ? html`<button class='round' @click=${() => this._shouldClose(true)}>${CANCEL_ICON}</button>` : ''}
		<button class='round default' @click=${this.commit}>${CHECK_CIRCLE_OUTLINE_ICON}</button>
	`;
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'app-dialog': AppDialog;
	}
}
