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
	SET_PACKET_COLLAPSED,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED,
	SomeAction
} from '../actions.js';

import {
	ObjectPath,
	PacketName,
	PacketType,
	Packets,
	packetType
} from '../types.js';

import {
	SeedID,
	SeedPacket,
	SeedPacketAbsoluteLocation
} from '../../src/types.js';

import {
	cloneAndDeleteProperty,
	cloneAndSetProperty,
	emptyWrappedSeedPacket,
	now
} from '../util.js';

import {
	DataState
} from '../types_store.js';

import {
	assertUnreachable
} from '../../src/util.js';

import {
	TypedObject
} from '../../src/typed-object.js';

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
	const currentSeed = currentPacket.data.seeds[state.currentSeed];
	const newSeed = value == DELETE_SENTINEL ? cloneAndDeleteProperty(currentSeed, path) : cloneAndSetProperty(currentSeed, path, value);
	return {
		...state,
		packets: {
			...state.packets,
			[state.currentPacket]: {
				...currentPacket,
				lastUpdated: now(),
				data: {
					...currentPacket.data,
					seeds: {
						...currentPacket.data.seeds,
						[state.currentSeed]: newSeed
					}
				}
			}
		}
	};
};

const deleteSeed = (state : DataState, packetName : PacketName, seedID: SeedID) : DataState => {
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const packet = state.packets[packetName];

	const newSeeds = {...packet.data.seeds};
	delete newSeeds[seedID];

	const newPackets : Packets = {
		...state.packets,
		[packetName]: {
			...packet,
			lastUpdated: now(),
			data: {
				...packet.data,
				seeds: newSeeds
			}
		}
	};
	return ensureValidPacketAndSeed({
		...state,
		packets: newPackets,
	});
};

const firstNonEmptyPacketName = (state : DataState) : {packetType : PacketType, packetName : PacketName} => {
	for (const pType of TypedObject.keys(packetType.enum)) {
		const packets = packetsOfType(state, pType);
		const packetName = Object.keys(packets)[0];
		if (packetName) {
			return {
				packetType: pType,
				packetName
			};
		}
	}
	return {
		packetType: 'local',
		packetName: ''
	};
};

const packetsOfType = (state : DataState, overrideType? : PacketType) : Packets => {

	const packetType = overrideType || state.currentPacketType;

	switch (packetType) {
	case 'local':
		return state.packets;
	case 'remote':
		return  state.remotePackets;
	default:
		return assertUnreachable(packetType);
	}
};

const setPacketsOfType = (state : DataState, packetType: PacketType, packets : Packets) : DataState => {
	const result = {
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
	return result;
};

const setPacketCollapsed = (state : DataState, packetType : PacketType, packetName : PacketName, collapsed : boolean) : DataState => {
	const packets = packetsOfType(state, packetType);
	const packet = packets[packetName];
	if (!packet) throw new Error(`No packet named ${packetName}`);
	return setPacketsOfType(state, packetType, {
		...packets,
		[packetName]: {
			...packet,
			collapsed
		}
	});
};

//A subset of DataState, useful for {...state, ...pickPacketAndSeed(state)};
type DataStateCurrentSeedProperties = {
	currentPacket : PacketName,
	currentPacketType : PacketType,
	currentSeed : SeedID
};

const ensureValidPacketAndSeed = (state : DataState) : DataState => {
	return {
		...state,
		...pickPacketAndSeed(state)
	};
};

const pickPacketAndSeed = (state : DataState) : DataStateCurrentSeedProperties => {
	let result : DataStateCurrentSeedProperties = {
		currentPacket: state.currentPacket,
		currentPacketType : state.currentPacketType,
		currentSeed: state.currentSeed
	};
	
	let packets = packetsOfType(state);
	let packet = packets[result.currentPacket];

	if (!packet) {
		//We need to select a new packet name.
		const selectedPacket = firstNonEmptyPacketName(state);
		result = {
			...result,
			currentPacket: selectedPacket.packetName,
			currentPacketType: selectedPacket.packetType
		};

		//Update packets and packet based on the new selection
		packets = packetsOfType(state, result.currentPacketType);
		packet = packets[result.currentPacket];

		//if there's still no packet, then make sure seed is empty.
		if (!packet) {
			result.currentSeed = '';
			return result;
		}
	}

	const seed = packet.data.seeds[result.currentSeed];
	if (!seed) {
		result.currentSeed = Object.keys(packet.data.seeds)[0] || '';
	}
	return result;

};

const pickSeedID = (currentSeed : SeedID, packetName : PacketName, packets : Packets) : SeedID => {
	//TODO: use pickPacketAndSeed in all places and remove this
	const packet = packets[packetName];

	if (!packet) return currentSeed;
	if (packet.data.seeds[currentSeed]) return currentSeed;
	return Object.keys(packet.data.seeds)[0] || '';
};

const data = (state : DataState = INITIAL_STATE, action : SomeAction) : DataState => {
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
		return ensureValidPacketAndSeed(setPacketsOfType(state, action.packetType, action.packets));
	case CREATE_PACKET:
		return {
			...state,
			packets: {
				...state.packets,
				[action.packet] : emptyWrappedSeedPacket()
			},
			currentPacketType: 'local',
			currentPacket: action.packet,
			currentSeed: ''
		};
	case DELETE_PACKET:
		const packets = packetsOfType(state, action.packetType);
		const newPackets = Object.fromEntries(Object.entries(packets).filter(entry => entry[0] != action.packet));
		return ensureValidPacketAndSeed(setPacketsOfType(state, action.packetType, newPackets));
	case REPLACE_PACKET:
		const p = action.data as SeedPacket;
		const pName = action.packet as PacketName;
		const nPackets : Packets = {
			...state.packets,
			[pName]: {
				...state.packets[pName],
				lastUpdated: now(),
				data: p
			}
		};
		return {
			...state,
			packets: nPackets,
			currentSeed: pickSeedID(state.currentSeed, state.currentPacket, nPackets)
		};
	case IMPORT_PACKET:
		const location = action.location as SeedPacketAbsoluteLocation;
		const r = action.data as SeedPacket;
		const rPackets : Packets = {
			...state.remotePackets,
			[location]: {
				lastUpdated: now(),
				collapsed: true,
				data: r
			}
		};
		return {
			...state,
			remotePackets: rPackets,
			currentPacket: action.location,
			currentPacketType: 'remote',
			currentSeed: pickSeedID(state.currentSeed, action.location, rPackets)
		};
	case SET_PACKET_COLLAPSED:
		return setPacketCollapsed(state, action.packetType, action.packet, action.collapsed);
	case CREATE_SEED:
		const cPacket = state.packets[action.packet];
		return {
			...state,
			currentSeed: action.seed,
			packets: {
				...state.packets,
				[action.packet]: {
					...cPacket,
					lastUpdated: now(),
					data: {
						...cPacket.data,
						seeds: {
							...cPacket.data.seeds,
							[action.seed]: {
								type: 'noop',
								value: 0
							}
						}
					}
				}
			}
		};
	case DELETE_SEED:
		return deleteSeed(state, action.packet, action.seed);
	case SWITCH_TO_PACKET:
		return ensureValidPacketAndSeed({
			...state,
			currentPacketType: action.packetType,
			currentPacket: action.packet
		});
	case SWITCH_TO_SEED:
		return {
			...state,
			currentPacketType: action.packetType,
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
