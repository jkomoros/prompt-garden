import {
	createStore,
	compose,
	applyMiddleware,
	combineReducers,
	StoreEnhancer,
	Reducer
} from 'redux';

import thunk, { ThunkAction, ThunkMiddleware } from 'redux-thunk';
import { lazyReducerEnhancer } from 'pwa-helpers/lazy-reducer-enhancer.js';

import {
	RootState
} from './types_store.js';

import {
	SomeAction
} from './actions.js';

import app from './reducers/app.js';

declare global {
	interface Window {
		process?: object;
		DEBUG_STORE: object;
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
	}
  }

// Sets up a Chrome extension for time travel debugging.
// See https://github.com/zalmoxisus/redux-devtools-extension for more information.
const devCompose: <Ext0, Ext1, StateExt0, StateExt1>(
	f1: StoreEnhancer<Ext0, StateExt0>, f2: StoreEnhancer<Ext1, StateExt1>
  ) => StoreEnhancer<Ext0 & Ext1, StateExt0 & StateExt1> =
	window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Initializes the Redux store with a lazyReducerEnhancer (so that you can
// lazily add reducers after the store has been created) and redux-thunk (so
// that you can dispatch async actions). See the "Redux and state management"
// section of the wiki for more details:
// https://github.com/Polymer/pwa-starter-kit/wiki/4.-Redux-and-state-management
export const store = createStore(
	state => state as Reducer<RootState,SomeAction>,
	devCompose(
		lazyReducerEnhancer(combineReducers),
		//TODO: this unknown cast is required to get a warning to go away, but
		//the warning is probably legit?
		applyMiddleware(thunk as unknown as ThunkMiddleware<RootState, SomeAction>))
);

// Initially loaded reducers.
store.addReducers({
	app
});

export type ThunkSomeAction = ThunkAction<void, RootState, undefined, SomeAction>;
