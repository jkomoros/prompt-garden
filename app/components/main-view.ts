import { html, css, TemplateResult} from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { connect } from 'pwa-helpers/connect-mixin.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

import {
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
	RootState,
} from '../types.js';

import {
	canonicalizePath,
} from '../actions/app.js';

import {
	loadPackets
} from '../actions/data.js';

import {
	fetchPacketsFromStorage
} from '../util.js';

@customElement('main-view')
class MainView extends connect(store)(PageViewElement) {

	@state()
		_pageExtra = '';

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
				Hello, World!
			</div>
		`;
	}

	// This is called every time something is updated in the store.
	override stateChanged(state : RootState) {
		this._pageExtra = selectPageExtra(state);
	}

	override firstUpdated() {
		store.dispatch(canonicalizePath());
		store.dispatch(loadPackets(fetchPacketsFromStorage()));
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'main-view': MainView;
	}
}