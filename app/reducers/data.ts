import {
	AnyAction
} from 'redux';

import {
	CHANGE_ENVIRONMENT_PROPERTY,
	CHANGE_PROPERTY,
	CREATE_PACKET,
	CREATE_SEED,
	DELETE_ENVIRONMENT_PROPERTY,
	DELETE_PACKET,
	DELETE_PROPERTY,
	DELETE_SEED,
	IMPORT_PACKET,
	LOAD_ENVIRONMENT,
	LOAD_PACKETS,
	REPLACE_PACKET,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED
} from '../actions/data.js';

import {
	ObjectPath,
	PacketName,
	PacketType,
	Packets
} from '../types.js';

import {
	SeedID,
	emptySeedPacket
} from '../../src/types.js';

import {
	cloneAndDeleteProperty,
	cloneAndSetProperty
} from '../util.js';

import {
	DataState
} from '../types_store.js';
import { assertUnreachable } from '../../src/util.js';

const INITIAL_STATE : DataState = {
	currentPacket: '',
	currentPacketType: 'local',
	currentSeed: '',
	packets: {},
	remotePackets: {},
	environment: {}
};

const DELETE_SENTINEL = { DELETE: true };

const modifyCurrentSeedProperty = (state : DataState, path : ObjectPath, value : unknown) : DataState => {
	
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const currentPacket = state.packets[state.currentPacket];
	const currentSeed = currentPacket.seeds[state.currentSeed];
	const newSeed = value == DELETE_SENTINEL ? cloneAndDeleteProperty(currentSeed, path) : cloneAndSetProperty(currentSeed, path, value);
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

const loadPackets = (state : DataState, packetType : PacketType, packets : Packets) : DataState => {

	const result : DataState = {
		...state
	};

	switch (packetType) {
	case 'local':
		result.packets = packets;
		break;
	case 'remote':
		result.remotePackets = packets;
		break;
	default:
		assertUnreachable(packetType);
	}

	if (!result.currentPacket) {
		result.currentPacketType = packetType;
		result.currentPacket = Object.keys(packets)[0] || '';
	}

	if (!result.currentSeed) {
		result.currentSeed = pickSeedID(result.currentSeed, result.currentPacket, packets);
	}

	return result;
};

const deletePacket = (state : DataState, packetType : PacketType, packetName : PacketName) : DataState => {
	const newPackets = Object.fromEntries(Object.entries(state.packets).filter(entry => entry[0] != packetName));
	const newPacket = state.currentPacket == packetName ? Object.keys(newPackets)[0] || '' : state.currentPacket;
	return {
		...state,
		packets: newPackets,
		currentPacket: newPacket,
		currentSeed: pickSeedID(state.currentSeed, newPacket, newPackets)
	};
};

const deleteSeed = (state : DataState, packetName : PacketName, seedID: SeedID) : DataState => {
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const packet = state.packets[packetName];

	const newSeeds = {...packet.seeds};
	delete newSeeds[seedID];

	const newPackets = {
		...state.packets,
		[packetName]: {
			...packet,
			seeds: newSeeds
		}
	};
	return {
		...state,
		currentSeed: pickSeedID(state.currentSeed, state.currentPacket, newPackets),
		packets: newPackets,
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
	case LOAD_ENVIRONMENT:
		return {
			...state,
			environment: action.environment,
		};
	case CHANGE_ENVIRONMENT_PROPERTY:
		return {
			...state,
			environment: {...state.environment, [action.key]: action.value}
		};
	case DELETE_ENVIRONMENT_PROPERTY:
		const newEnvironment = {...state.environment};
		delete newEnvironment[action.key];
		return {
			...state,
			environment: newEnvironment
		};
	case LOAD_PACKETS:
		return loadPackets(state, action.packetType, action.packets);
	case CREATE_PACKET:
		return {
			...state,
			packets: {
				...state.packets,
				[action.packet] : emptySeedPacket()
			},
			currentPacket: action.packet,
			currentSeed: ''
		};
	case DELETE_PACKET:
		return deletePacket(state, action.packetType, action.packet);
	case REPLACE_PACKET:
		const nPackets = {
			...state.packets,
			[action.packet]: action.data
		};
		return {
			...state,
			packets: nPackets,
			currentSeed: pickSeedID(state.currentSeed, state.currentPacket, nPackets)
		};
	case IMPORT_PACKET:
		const rPackets = {
			...state.remotePackets,
			[action.location]: action.data
		};
		return {
			...state,
			remotePackets: rPackets,
			currentPacket: action.location,
			currentPacketType: 'remote',
			currentSeed: pickSeedID(state.currentSeed, action.location, rPackets)
		};
	case CREATE_SEED:
		const cPacket = state.packets[action.packet];
		return {
			...state,
			currentSeed: action.seed,
			packets: {
				...state.packets,
				[action.packet]: {
					...cPacket,
					seeds: {
						...cPacket.seeds,
						[action.seed]: {
							type: 'noop',
							value: 0
						}
					}
				}
			}
		};
	case DELETE_SEED:
		return deleteSeed(state, action.packet, action.seed);
	case SWITCH_TO_PACKET:
		return {
			...state,
			currentPacket: action.packet,
			currentSeed: pickSeedID(state.currentSeed, action.packet, state.packets)
		};
	case SWITCH_TO_SEED:
		return {
			...state,
			currentPacket: action.packet,
			currentSeed: action.seed
		};
	case CHANGE_PROPERTY:
		return modifyCurrentSeedProperty(state, action.path, action.value);
	case DELETE_PROPERTY:
		return modifyCurrentSeedProperty(state, action.path, DELETE_SENTINEL);
	default:
		return state;
	}
};

export default data;
