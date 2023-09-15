import { css, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
	DialogElement
} from './dialog-element.js';

import {
	RootState,
	RunStatus
} from '../types_store.js';

import {
	selectGardenError,
	selectGardenEvents,
	selectGardenRef,
	selectGardenResult,
	selectGardenStatus,
	selectGardenSuccess,
} from '../selectors.js';

import {
	CHECK_CIRCLE_OUTLINE_ICON
} from './my-icons.js';

import {
	SharedStyles
} from './shared-styles.js';

import {
	ButtonSharedStyles
} from './button-shared-styles.js';

import {
	closeRunDialog
} from '../actions/garden.js';

import {
	SeedReference
} from '../../src/types.js';

import {
	CalculationEvent
} from '../../src/calculation.js';

import {
	assertUnreachable
} from '../../src/util.js';

@customElement('run-dialog')
export class RunDialog extends connect(store)(DialogElement) {
	
	@state()
		_status : RunStatus = 'idle';
	
	@state()
		_ref : SeedReference | null = null;

	@state()
		_success = false;

	@state()
		_result : unknown = null;

	@state()
		_error = '';

	@state()
		_events : CalculationEvent[] = [];

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

		this._status = selectGardenStatus(state);
		this._ref = selectGardenRef(state);
		this._success = selectGardenSuccess(state);
		this._result = selectGardenResult(state);
		this._error = selectGardenError(state);
		this._events = selectGardenEvents(state);
	
		this.open = this._status != 'idle';
		this.title = 'Running';
	}

	closeDialog() {
		store.dispatch(closeRunDialog());
	}

	_lineBreaks(content : string) : TemplateResult {
		return html`
			${content.split('\n').map((line, index, arr) => html`
			${line}${index < arr.length - 1 ? html`<br/>` : ''}
			`)}
		`;
	}

	override innerRender() : TemplateResult {

		let resultRow = html``;

		switch (this._status) {
		case 'idle':
			resultRow = html`<em>Idle</em>`;
			break;
		case 'running':
			resultRow = html`<em>Running...</em>`;
			break;
		case 'finished':
			if (this._success) {
				resultRow = html`<h3>Result</h3><p>${this._lineBreaks(String(this._result))}</p>`;
			} else {
				resultRow = html`<h3>Error</h3><p>${this._error}</p>`;
			}
			break;
		default:
			assertUnreachable(this._status);
		}

		return html`<details>
			<summary>${this._events.length} Events</summary>
			${this._events.map(event => html`
				<div class='row'>
					<!-- TODO: render out prettier -->
					<pre>${JSON.stringify(event, null, '\t')}</pre>
				</div>
			`)}
		</details>
		<div class='results'>
			${resultRow}
		</div>
		`;
	}

	override _shouldClose(_cancelled : boolean) {
		this.closeDialog();
	}

	override buttonsRender() : TemplateResult {
		return html`
		<button class='round default' @click=${this.closeDialog}>${CHECK_CIRCLE_OUTLINE_ICON}</button>
	`;
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'run-dialog': RunDialog;
	}
}
