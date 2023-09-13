import {
	CHANGE_ENVIRONMENT_PROPERTY,
	CHANGE_PROPERTY,
	COLLAPSE_PROPERTY,
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
	CollapsedSeedMap,
	ObjectPath,
	PacketName,
	PacketType,
	Packets,
	packetType
} from '../types.js';

import {
	SeedID,
	SeedPacket,
	SeedPacketIsh,
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
	
	const newPacket = {
		...currentPacket.data,
		seeds: {
			...currentPacket.data.seeds,
			[state.currentSeed]: newSeed
		}
	};
	
	return {
		...state,
		packets: {
			...state.packets,
			[state.currentPacket]: {
				...currentPacket,
				lastUpdated: now(),
				data: newPacket,
				//We might have modified the packet to delete a key--or even to
				//change in place a key that was an object and is now a leaf.
				collapsed: normalizeCollapsedMap(trimExtraneousCollapsedPacket(newPacket, currentPacket.collapsed))
			}
		}
	};
};

//Returns either the map if it's already normalized, or a copy that is
//normalized. Normalized means that any sub-trees that consist entirely of
//collapsed:false are trimmed.
const normalizeCollapsedMap = (map : CollapsedSeedMap) : CollapsedSeedMap => {
	let changesMade = false;
	const result = {
		...map,
		seeds: {
			...map.seeds
		}
	};
	for (const [key, subMap] of TypedObject.entries(map.seeds)) {
		if (collapsedMapEmpty(subMap)) {
			delete result.seeds[key];
			changesMade = true;
		}
	}

	if (!changesMade) return map;
	return result;
};

const collapsedMapEmpty = (map : CollapsedSeedMap) : boolean => {
	if (map.collapsed) return false;
	return Object.values(map.seeds).every(subMap => collapsedMapEmpty(subMap));
};

const collapseSeedProperty = (map : CollapsedSeedMap | undefined, path: ObjectPath, collapsed : boolean) : CollapsedSeedMap => {
	if (!map) map = {collapsed: false, seeds: {}};
	if (path.length == 0) {
		return {
			...map,
			collapsed
		};
	}
	//TODO: trim any subtrees who only has collapsed: false within it, any time a collapsed subTree is modified.
	return {
		...map,
		seeds: {
			...map.seeds,
			[path[0]]: collapseSeedProperty(map.seeds[path[0]] , path.slice(1), collapsed)
		}
	};
};

const collapseCurrentSeedProperty = (state : DataState, path : ObjectPath, collapsed : boolean) : DataState => {
	
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const currentPacket = state.packets[state.currentPacket];

	const newCollapsed = {
		...currentPacket.collapsed,
		seeds: {
			...currentPacket.collapsed.seeds,
			[state.currentSeed]: collapseSeedProperty(currentPacket.collapsed.seeds[state.currentSeed], path, collapsed)
		}
	};

	return {
		...state,
		packets: {
			...state.packets,
			[state.currentPacket]: {
				...currentPacket,
				collapsed: normalizeCollapsedMap(newCollapsed)
			}
		}
	};
};

const trimExtraneousCollapsedSeed = (data : unknown, map : CollapsedSeedMap) : CollapsedSeedMap => {
	let changesMade = false;
	const result = {
		...map,
		seeds: {
			...map.seeds
		}
	};

	if (!data || typeof data != 'object') {
		if (Object.keys(map.seeds).length) {
			//We have sub keys but the item is a 
			return {
				...map,
				seeds: {}
			};
		}
		return map;
	}

	for (const [prop, subMap] of TypedObject.entries(map.seeds)) {
		const propValue = (data as Record<string, unknown>)[prop];
		if (propValue === undefined) {
			delete result.seeds[prop];
			changesMade = true;
			continue;
		}
		const subResult = trimExtraneousCollapsedSeed(propValue, subMap);
		if (subResult === subMap) continue;
		changesMade = true;
		result.seeds[prop] = subResult;
	}
	
	if (!changesMade) return map;
	return result;
};

const trimExtraneousCollapsedPacket = (packet : SeedPacketIsh, map : CollapsedSeedMap) : CollapsedSeedMap => {
	let changesMade = false;
	const result = {
		...map,
		seeds: {
			...map.seeds
		}
	};
	for (const [seedID, subMap] of TypedObject.entries(map.seeds)) {
		if (!packet.seeds[seedID]) {
			delete result.seeds[seedID];
			changesMade = true;
			continue;
		}
		const resultMap = trimExtraneousCollapsedSeed(packet.seeds[seedID], subMap);
		if (resultMap === subMap) continue;
		changesMade = true;
		result.seeds[seedID] = resultMap;
	}
	if (!changesMade) return map;
	return result;
};

const deleteSeed = (state : DataState, packetName : PacketName, seedID: SeedID) : DataState => {
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const packet = state.packets[packetName];

	const newSeeds = {...packet.data.seeds};
	delete newSeeds[seedID];

	//If there was a collapsed map for that field, also delete it
	const newCollapsed = {...packet.collapsed.seeds};
	delete newCollapsed[seedID];

	const newPacket = {
		...packet.data,
		seeds: newSeeds
	};

	const newPackets : Packets = {
		...state.packets,
		[packetName]: {
			...packet,
			lastUpdated: now(),
			data: newPacket,
			collapsed: normalizeCollapsedMap(trimExtraneousCollapsedPacket(newPacket, packet.collapsed))
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
	//Fail silently; other things will have validated before they get here.
	if (!packet) return state;
	//If there's no change to make then just return
	if (packet.collapsed.collapsed == collapsed) return state;
	return setPacketsOfType(state, packetType, {
		...packets,
		[packetName]: {
			...packet,
			collapsed: {
				...packet.collapsed,
				collapsed
			}
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
	const result = {
		...state,
		...pickPacketAndSeed(state)
	};
	//Ensure the current packet is not collapsed
	return setPacketCollapsed(result, result.currentPacketType, result.currentPacket, false);
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
				collapsed: {collapsed: action.collapsed, seeds:{}},
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
		return ensureValidPacketAndSeed({
			...state,
			currentPacketType: action.packetType,
			currentPacket: action.packet,
			currentSeed: action.seed
		});
	case COLLAPSE_PROPERTY:
		return collapseCurrentSeedProperty(state, action.path, action.collapsed);
	case CHANGE_PROPERTY:
		return modifyCurrentSeedProperty(state, action.path, action.value);
	case DELETE_PROPERTY:
		return modifyCurrentSeedProperty(state, action.path, DELETE_SENTINEL);
	default:
		return state;
	}
};

export default data;
