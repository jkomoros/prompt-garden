import {
	AnyAction
} from 'redux';

import {
	CREATE_PACKET,
	DELETE_PACKET,
	LOAD_PACKETS,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED
} from '../actions/data.js';

import {
	DataState,
	PacketName,
	Packets
} from '../types.js';

import {
	SeedID,
	emptySeedPacket
} from '../../src/types.js';

const INITIAL_STATE : DataState = {
	currentPacket: '',
	currentSeed: '',
	packets: {}
};

const pickSeedID = (currentSeed : SeedID, packetName : PacketName, packets : Packets) : SeedID => {
	const packet = packets[packetName];

	if (!packet) return currentSeed;
	if (packet.seeds[currentSeed]) return currentSeed;
	return Object.keys(packet.seeds)[0] || '';
};

const data = (state : DataState = INITIAL_STATE, action : AnyAction) : DataState => {
	switch (action.type) {
	case LOAD_PACKETS:
		const currentPacket = state.currentPacket || Object.keys(action.packets)[0] || '';
		return {
			...state,
			packets: action.packets,
			currentPacket,
			currentSeed: pickSeedID(state.currentSeed, currentPacket, action.packets)
		};
	case CREATE_PACKET:
		return {
			...state,
			packets: {
				...state.packets,
				[action.name] : emptySeedPacket()
			},
			currentPacket: action.name,
			currentSeed: ''
		};
	case DELETE_PACKET:
		const newPackets = Object.fromEntries(Object.entries(state.packets).filter(entry => entry[0] != action.name));
		const newPacket = state.currentPacket == action.name ? Object.keys(newPackets)[0] || '' : state.currentPacket;
		return {
			...state,
			packets: newPackets,
			currentPacket: newPacket,
			currentSeed: pickSeedID(state.currentSeed, newPacket, newPackets)
		};
	case SWITCH_TO_PACKET:
		return {
			...state,
			currentPacket: action.name,
			currentSeed: pickSeedID(state.currentSeed, action.name, state.packets)
		};
	case SWITCH_TO_SEED:
		return {
			...state,
			currentSeed: action.seed
		};
	default:
		return state;
	}
};

export default data;
