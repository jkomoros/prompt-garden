import {
	AnyAction
} from 'redux';

import {
	GardenState
} from '../types.js';

import {
	START_SEED
} from '../actions/garden.js';

const INITIAL_STATE : GardenState = {
	status: 'idle',
	packetName: '',
	seedID: ''
};

const app = (state : GardenState = INITIAL_STATE, action : AnyAction) : GardenState => {
	switch (action.type) {
	case START_SEED:
		return {
			...state,
			status: 'running',
			seedID: action.seedID,
			packetName: action.packetName
		};
	default:
		return state;
	}
};

export default app;
