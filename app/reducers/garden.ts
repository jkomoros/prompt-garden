import {
	AnyAction
} from 'redux';

import {
	GardenState
} from '../types_store.js';

import {
	SEED_ERRORED,
	SEED_FINISHED,
	START_SEED
} from '../actions.js';

const INITIAL_STATE : GardenState = {
	status: 'idle',
	ref: null,
	result: null,
	success: false,
	error: ''
};

const app = (state : GardenState = INITIAL_STATE, action : AnyAction) : GardenState => {
	switch (action.type) {
	case START_SEED:
		return {
			...state,
			status: 'running',
			ref: action.ref,
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
