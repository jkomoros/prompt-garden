import { LitElement, html, css, TemplateResult } from 'lit';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { installOfflineWatcher } from 'pwa-helpers/network.js';
import { installRouter } from 'pwa-helpers/router.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { customElement, property, state } from 'lit/decorators.js';

// This element is connected to the Redux store.
import { store } from '../store.js';

// These are the actions needed by this element.
import {
	navigate,
	updateOffline,
} from '../actions/app.js';

import {
	RootState
} from '../types_store.js';

@customElement('my-app')
class MyApp extends connect(store)(LitElement) {

	@property({ type : String })
		appTitle = '';

	@state()
		_page = '';

	@state()
		_offline = false;

	static override get styles() {
		return [
			css`
				:host {
					display: block;
					position: relative;
					width: 100%;
					height: 100%;
				}

				header {
					display: flex;
					flex-direction: column;
					align-items: center;
				}

				.toolbar-list > a {
					display: inline-block;
					color: black;
					text-decoration: none;
					padding: 0 8px;
				}

				.toolbar-list > a[selected] {
					font-weight: bold;
				}

				/* Workaround for IE11 displaying <main> as inline */
				main {
					display: block;
					--app-background-color: #EEE;
					--disabled-color: #CCC;
					--dark-gray-color: #666;
					--lighter-gray-color: #999;
					--app-primary-color: #51b9a3;
					--app-light-text-color: white;
					/* Also encoded as CONTROLS_WIDTH above */
					--controls-width: 18em;
					--default-border: 1px solid var(--dark-gray-color);
					font-size: 0.8em;
				}

				.page {
					display: none;
				}

				.page[active] {
					display: block;
				}

				footer {
					border-top: 1px solid #ccc;
					text-align: center;
				}

				/* Wide layout */
				@media (min-width: 460px) {
					header {
						flex-direction: row;
					}
				}
			`
		];
	}

	override render() : TemplateResult {
		// Anything that's related to rendering should be done in here.
		return html`
			<!-- Main content -->
			<main role="main" class="main-content">
				<main-view class="page" ?active="${this._page === 'main'}"></main-view>
				<my-view404 class="page" ?active="${this._page === 'view404'}"></my-view404>
			</main>
		`;
	}

	override firstUpdated() {
		installRouter((location) => store.dispatch(navigate(decodeURIComponent(location.pathname))));
		installOfflineWatcher((offline) => store.dispatch(updateOffline(offline)));
	}

	override updated(changedProps : Map<keyof MyApp, MyApp[keyof MyApp]>) {
		if (changedProps.has('_page')) {
			const pageTitle = this.appTitle + ' - ' + this._page;
			updateMetadata({
				title: pageTitle,
				description: pageTitle
				// This object also takes an image property, that points to an img src.
			});
		}
	}

	override stateChanged(state : RootState) {
		this._page = state.app.page;
		this._offline = state.app.offline;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'my-app': MyApp;
	}
}
