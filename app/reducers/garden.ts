import {
	GardenState
} from '../types_store.js';

import {
	CLOSE_RUN_DIALOG,
	SEED_ERRORED,
	SEED_EVENT,
	SEED_FINISHED,
	START_SEED,
	SomeAction
} from '../actions.js';

const INITIAL_STATE : GardenState = {
	status: 'idle',
	ref: null,
	result: null,
	success: false,
	error: '',
	events: []
};

const app = (state : GardenState = INITIAL_STATE, action : SomeAction) : GardenState => {
	switch (action.type) {
	case START_SEED:
		return {
			...state,
			status: 'running',
			ref: action.ref,
			events: []
		};
	case SEED_EVENT:
		return {
			...state,
			events: [...state.events, action.event]
		};
	case SEED_ERRORED:
		return {
			...state,
			status: 'finished',
			success: false,
			error: action.error,
			result: null
		};
	case SEED_FINISHED:
		return {
			...state,
			status: 'finished',
			success: true,
			result: action.result,
			error: ''
		};
	case CLOSE_RUN_DIALOG:
		return {
			...state,
			status: 'idle'
		};
	default:
		return state;
	}
};

export default app;
