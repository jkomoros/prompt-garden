import {
	GardenState
} from '../types_store.js';

import {
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
			status: 'idle',
			success: false,
			error: action.error,
			result: null
		};
	case SEED_FINISHED:
		return {
			...state,
			status: 'idle',
			success: true,
			result: action.result,
			error: ''
		};
	default:
		return state;
	}
};

export default app;
