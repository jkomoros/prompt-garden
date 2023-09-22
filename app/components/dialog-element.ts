import { LitElement, html, css, TemplateResult } from 'lit';

import { customElement, property } from 'lit/decorators.js';

import { SharedStyles } from './shared-styles.js';

import { ButtonSharedStyles } from './button-shared-styles.js';

import {
	CANCEL_ICON
} from './my-icons.js';

import {
	makeDialogShouldCloseEvent
} from '../events.js';

import {
	multiLineTextEditingActive
} from '../keyboard.js';

//A list of all dialogs in order they were added. We assume the most recent one
//constructed is on top. We unshift new ones in the constructor onto it.
const DIALOGS : DialogElement[] = [];

//Returns the first dialog that is actively open; the one that should receive keyboard events.
const activeDialog = () : DialogElement | null => {
	for (const dialog of DIALOGS) {
		if (dialog.open) return dialog;
	}
	return null;
};

@customElement('dialog-element')
export class DialogElement extends LitElement {

	@property({ type : Boolean })
		open = false;

	@property({ type : String })
	override title = '';

	@property({ type : Boolean })
		mobile = false;

	@property({ type : Boolean})
		hideClose = false;

	static override get styles() {
		return [
			css`
			.container {
				position: absolute;
				height: 100%;
				width: 100%;
				top: 0;
				left: 0;
				/* Note that card-preview has a z-index higher than this to
				show up above it */
				z-index: 1000;
				display: none;
			}

			.container.open {
				display: block;
			}

			.background {
				position:absolute;
				height:100%;
				width:100%;
				top:0;
				left:0;
				background-color:#FFFFFFCC;
				display:flex;
				flex-direction:column;
				align-items: center;
				justify-content:center;
			}

			.content {
				background-color:white;
				padding:1em;
				box-sizing: border-box;
				box-shadow: 0 2px 6px #CCC;
				position:relative;
				display:flex;
				flex-direction:column;
				min-height: 40%;
				min-width: 40%;
				max-height:90%;
				max-width:70%;
			}

			.mobile .content {
				height:100%;
				width:100%;
				max-height:none;
				max-width:none;
			}

			h2 {
				font-weight: normal;
				font-size:1.5em;
				text-align:left;
				margin:0;
			}

			#close {
				position: absolute;
				top: 0.5em;
				right: 0.5em;
			}

			#inner {
				flex-grow:1;
				display:flex;
				flex-direction:column;
				overflow:scroll;
			}

			.buttons {
					display: flex;
					justify-content: flex-end;
			}

			`,
			SharedStyles,
			ButtonSharedStyles
		];
	}

	constructor() {
		super();
		DIALOGS.unshift(this);
		this.hideClose = false;
	}

	override render() : TemplateResult {
		return html`
			<div class='container ${this.open ? 'open' : 'closed'}'>
				<div class='background ${this.mobile ? 'mobile': ''}' @click=${this._handleBackgroundClicked}>
					<div class='content'>
						${this.hideClose ? '' : html`<button class='small' id='close' @click=${this.cancel}>${CANCEL_ICON}</button>`}
						<h2>${this.title || ''}</h2>
						<div id='inner'>
						${this.innerRender()}
						</div>
						<div class='buttons'>
						${this.buttonsRender()}
						</div>
					</div>
				</div>
			</div>
	`;
	}

	innerRender() : TemplateResult {
		//You can subclass this and return somethingelse for innerRender or use it directly with content inside.
		return html`<slot></slot>`;
	}

	buttonsRender() : TemplateResult {
		//You can subclass this and return somethingelse for innerRender or use it directly with content inside.
		return html`<slot name='buttons'></slot>`;
	}

	override firstUpdated() {
		window.addEventListener('keydown', e => this._handleKeyDown(e));
	}

	_handleKeyDown(e : KeyboardEvent) : void {
		if (!this.open) return;
		//Only take the focus if we are the top-most active dialog.
		if (activeDialog() != this) return;
		if (e.key == 'Escape') {
			this.cancel();
		}
		if (e.key == 'Enter') {
			if (multiLineTextEditingActive()) return;
			this.commit();
		}
	}

	_handleBackgroundClicked(e : MouseEvent) : void {
		const background = this._root.querySelector('.background');
		//If the click wasn't actualy directly on the background then ignore it.
		if (e.composedPath()[0] != background) return;
		this._shouldClose();
	}

	get _root() : ShadowRoot {
		return this.shadowRoot as ShadowRoot;
	}

	cancel() {
		this._shouldClose(true);
	}

	commit() {
		this._shouldClose(false);
	}

	_shouldClose(cancelled = false) {
		//Override point for sub classes
		this.dispatchEvent(makeDialogShouldCloseEvent(cancelled));
	}

	_focusInputOnOpen() {
		//Override point for sub classes

		//Make sure if there's a text field it's focused.

		let input = this._root.querySelector('input[type=text]');
		if (!input) input = this._root.querySelector('input[type=search]');
		if (!input) input = this._root.querySelector('textarea');
		if (!input) {
			const slot = this._root.querySelector('slot');
			if (slot){
				for (const ele of slot.assignedElements()) {
					if (ele.localName == 'textarea') {
						input = ele;
						break;
					}
					if (ele instanceof HTMLInputElement) {
						if (ele.type != 'text') continue;
						input = ele;
						break;
					}
				}
			}
		}
		if (!input) return;
		if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) throw new Error('not input ele');
		input.focus();
		input.select();
	}

	override updated(changedProps : Map<keyof DialogElement, DialogElement[keyof DialogElement]>) {
		if (changedProps.has('open')) {
			if (this.open) this._focusInputOnOpen();
		}
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'dialog-element': DialogElement;
	}
}
