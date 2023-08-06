import {
	AnyAction
} from 'redux';

import {
	CREATE_PACKET,
	DELETE_PACKET,
	LOAD_PACKETS,
	SWITCH_TO_PACKET
} from '../actions/data.js';

import {
	DataState,
} from '../types.js';

import {
	SeedPacket
} from '../../src/types.js';

const INITIAL_STATE : DataState = {
	currentPacket: '',
	currentSeed: '',
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
	case LOAD_PACKETS:
		return {
			...state,
			packets: action.packets,
			currentPacket: state.currentPacket || Object.keys(action.packets)[0] || ''
		};
	case CREATE_PACKET:
		return {
			...state,
			packets: {
				...state.packets,
				[action.name] : emptySeedPacket()
			},
			currentPacket: action.name
		};
	case DELETE_PACKET:
		const newPackets = Object.fromEntries(Object.entries(state.packets).filter(entry => entry[0] != action.name));
		return {
			...state,
			packets: newPackets,
			currentPacket: state.currentPacket == action.name ? Object.keys(newPackets)[0] || '' : state.currentPacket
		};
	case SWITCH_TO_PACKET:
		return {
			...state,
			currentPacket: action.name
		};
	default:
		return state;
	}
};

export default data;
