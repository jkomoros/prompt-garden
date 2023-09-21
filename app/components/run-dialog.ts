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
	CalculationEvent,
	CalculationEventSeedStart,
	inProgressSeed,
	nestCalculationEvents,
	NestedCalculationEvent
} from '../../src/calculation.js';

import {
	assertUnreachable
} from '../../src/util.js';

import {
	packSeedReference
} from '../../src/reference.js';

import {
	TypedObject
} from '../../src/typed-object.js';

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

	@state()
		_nestedEvent? : NestedCalculationEvent;

	@state()
		_inProgressEvent : CalculationEventSeedStart | null = null;

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
		this.title = 'Running ' + (this._ref ? packSeedReference(this._ref) : '');
	}

	override updated(changedProps : Map<string, RunDialog[keyof RunDialog]>) {
		if (changedProps.has('_events')) {
			this._nestedEvent = nestCalculationEvents(this._events);
			this._inProgressEvent = inProgressSeed(this._events);
		}
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
			<summary>${this._events.length} Events (${this._inProgressEvent ? 'Running: ' + packSeedReference(this._inProgressEvent.ref) : 'Finished' })</summary>
			${this._rowForNestedEvent(this._nestedEvent)}
		</details>
		<div class='results'>
			${resultRow}
		</div>
		`;
	}

	_rowForNestedEvent(event? : NestedCalculationEvent) : TemplateResult {
		if (!event) return html``;
		return html`<details .open=${true}>
			<summary>${packSeedReference(event.ref)}</summary>
			<div class='row'>
				${TypedObject.entries(event.children).map(entry => html`<label>${entry[0]}</label>${this._rowForNestedEvent(entry[1])}`)}
			</div>
			<!-- TODO: print out otherEvents -->
			<div class='row'>
				<label>Result</label> <span>${JSON.stringify(event.result, null, '\t')}</span>
			</div>
		</details>`;
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
