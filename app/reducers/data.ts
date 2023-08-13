import {
	AnyAction
} from 'redux';

import {
	CHANGE_PROPERTY,
	CREATE_PACKET,
	DELETE_PACKET,
	LOAD_PACKETS,
	REPLACE_PACKET,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED
} from '../actions/data.js';

import {
	DataState,
	ObjectPath,
	PacketName,
	Packets
} from '../types.js';

import {
	SeedID,
	emptySeedPacket
} from '../../src/types.js';

import {
	cloneAndSetProperty
} from '../util.js';

const INITIAL_STATE : DataState = {
	currentPacket: '',
	currentSeed: '',
	packets: {}
};

const modifyCurrentSeedProperty = (state : DataState, path : ObjectPath, value : unknown) : DataState => {
	
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const currentPacket = state.packets[state.currentPacket];
	const currentSeed = currentPacket.seeds[state.currentSeed];
	const newSeed = cloneAndSetProperty(currentSeed, path, value);
	return {
		...state,
		packets: {
			...state.packets,
			[state.currentPacket]: {
				...currentPacket,
				seeds: {
					...currentPacket.seeds,
					[state.currentSeed]: newSeed
				}
			}
		}
	};
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
	case REPLACE_PACKET:
		const nPackets = {
			...state.packets,
			[action.name]: action.packet
		};
		return {
			...state,
			packets: nPackets,
			currentSeed: pickSeedID(state.currentSeed, state.currentPacket, nPackets)
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
	case CHANGE_PROPERTY:
		return modifyCurrentSeedProperty(state, action.path, action.value);
	default:
		return state;
	}
};

export default data;
