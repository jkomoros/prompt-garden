import {
	AnyAction
} from 'redux';

import {
	CREATE_PACKET
} from '../actions/data.js';

import {
	DataState,
} from '../types.js';

import {
	SeedPacket
} from '../../src/types.js';

const INITIAL_STATE : DataState = {
	packets: {}
};

const emptySeedPacket = () : SeedPacket => {
	return {
		version: 0,
		seeds: {}
	};
};

const data = (state : DataState = INITIAL_STATE, action : AnyAction) : DataState => {
	switch (action.type) {
	case CREATE_PACKET:
		return {
			packets: {
				...state.packets,
				[action.name] : emptySeedPacket()
			}
		};
	default:
		return state;
	}
};

export default data;
