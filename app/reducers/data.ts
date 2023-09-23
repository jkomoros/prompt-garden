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
	RENAME_SEED,
	IMPORT_PACKET,
	LOAD_ENVIRONMENT,
	LOAD_PACKETS,
	REPLACE_PACKET,
	SET_PACKET_COLLAPSED,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED,
	SomeAction,
	UNDO,
	REDO,
	FORK_PACKET
} from '../actions.js';

import {
	CollapsedSeedMap,
	EnvironmentContext,
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
	SeedPacketAbsoluteLocation,
	Value,
	EnvironmentData
} from '../../src/types.js';

import {
	cloneAndDeleteProperty,
	cloneAndSetProperty,
	emptyWrappedSeedPacket,
	now
} from '../util.js';

import {
	DataState,
	VersionedDataState
} from '../types_store.js';

import {
	assertUnreachable
} from '../../src/util.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	currentVersion,
	initialVersion,
	pushVersion,
	redo,
	undo
} from '../undoable.js';

import {
	packetTypeEditable
} from '../util.js';

const INITIAL_STATE : DataState = {
	currentPacket: '',
	currentPacketType: 'local',
	currentSeed: '',
	versioned: initialVersion({
		packets: {},
		environment: {}
	}, ''),
	remotePackets: {}
};

const DELETE_SENTINEL = { DELETE: true };

const modifyCurrentSeedProperty = (state : DataState, path : ObjectPath, value : unknown) : DataState => {
	
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const currentState = currentVersion(state.versioned);

	const currentPackets = currentState.packets;

	const currentPacket = currentPackets[state.currentPacket];
	const currentSeed = currentPacket.data.seeds[state.currentSeed];
	const newSeed = value == DELETE_SENTINEL ? cloneAndDeleteProperty(currentSeed, path) : cloneAndSetProperty(currentSeed, path, value);
	
	const newPacket = {
		...currentPacket.data,
		seeds: {
			...currentPacket.data.seeds,
			[state.currentSeed]: newSeed
		}
	};
	
	const newPackets = {
		...currentPackets,
		[state.currentPacket]: {
			...currentPacket,
			lastUpdated: now(),
			data: newPacket,
			//We might have modified the packet to delete a key--or even to
			//change in place a key that was an object and is now a leaf.
			collapsed: normalizeCollapsedMap(trimExtraneousCollapsedPacket(newPacket, currentPacket.collapsed))
		}
	};

	const newCurrentState : VersionedDataState = {
		...currentState,
		packets: newPackets
	};

	const description = value == DELETE_SENTINEL ? `Delete seed property ${path.join('.')}` : `Modify seed property ${path.join('.')} to ${String(value)}`;

	return {
		...state,
		versioned: pushVersion(state.versioned, newCurrentState, description)
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

	const currentPackets = packetsOfType(state, state.currentPacketType);
	const currentPacket = currentPackets[state.currentPacket];

	const newCollapsed = {
		...currentPacket.collapsed,
		seeds: {
			...currentPacket.collapsed.seeds,
			[state.currentSeed]: collapseSeedProperty(currentPacket.collapsed.seeds[state.currentSeed], path, collapsed)
		}
	};

	const newPackets = {
		...currentPackets,
		[state.currentPacket]: {
			...currentPacket,
			collapsed: normalizeCollapsedMap(newCollapsed)
		}
	};

	const description = `${collapsed ? 'Collapse' : 'Expand'} seed property ${path.join('.')}`;

	return setPacketsOfType(state, state.currentPacketType, newPackets, description);
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

	const currentState = currentVersion(state.versioned);

	const packets = currentState.packets;
	const packet = packets[packetName];

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
		...packets,
		[packetName]: {
			...packet,
			lastUpdated: now(),
			data: newPacket,
			collapsed: normalizeCollapsedMap(trimExtraneousCollapsedPacket(newPacket, packet.collapsed))
		}
	};

	const newCurrentState : VersionedDataState = {
		...currentState,
		packets: newPackets
	};

	const description = `Delete seed ${packetName}:${seedID}`;

	return ensureValidPacketAndSeed({
		...state,
		versioned: pushVersion(state.versioned, newCurrentState, description),
	});
};

const renameSeed = (state : DataState, packetName : PacketName, oldName: SeedID, newName: SeedID) : DataState => {
	//This is here to verify that we don't accidentally mess with properties we don't intend to.
	Object.freeze(state);

	const currentState = currentVersion(state.versioned);

	const packets = currentState.packets;
	const packet = packets[packetName];

	const newSeeds = {...packet.data.seeds};
	newSeeds[newName] = newSeeds[oldName];
	delete newSeeds[oldName];
	
	//If there was a collapsed map for that field, also delete it
	const newCollapsed = {...packet.collapsed.seeds};
	newCollapsed[newName] = newCollapsed[oldName];
	delete newCollapsed[oldName];

	const newPacket = {
		...packet.data,
		seeds: newSeeds
	};

	const newPackets : Packets = {
		...packets,
		[packetName]: {
			...packet,
			lastUpdated: now(),
			data: newPacket,
			collapsed: normalizeCollapsedMap(trimExtraneousCollapsedPacket(newPacket, packet.collapsed))
		}
	};

	const newCurrentState : VersionedDataState = {
		...currentState,
		packets: newPackets
	};

	const description = `Rename seed ${packetName}:${oldName} to ${newName}`;

	const result = ensureValidPacketAndSeed({
		...state,
		versioned: pushVersion(state.versioned, newCurrentState, description),
	});

	if (result.currentPacket == packetName && result.currentPacketType == 'local' && result.currentSeed == oldName) {
		result.currentSeed = newName;
	}
	return result;
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
		return currentVersion(state.versioned).packets;
	case 'remote':
		return  state.remotePackets;
	default:
		return assertUnreachable(packetType);
	}
};

const setPacketsOfType = (state : DataState, packetType: PacketType, packets : Packets, description : string, resetHistory = false) : DataState => {
	const result = {
		...state
	};
	switch (packetType) {
	case 'local':
		const currentState = currentVersion(state.versioned);
		const newState = {...currentState, packets};
		result.versioned = resetHistory ? initialVersion(newState, description) : pushVersion(state.versioned, newState, description);
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

	const description = `${collapsed ? 'Collapse' : 'Expand'} packet ${packetName}`;

	return setPacketsOfType(state, packetType, {
		...packets,
		[packetName]: {
			...packet,
			collapsed: {
				...packet.collapsed,
				collapsed
			}
		}
	}, description);
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

const forkPacket = (state : DataState, packetName : PacketName, packetType : PacketType, newPacket : PacketName) : DataState => {
	const packets = packetsOfType(state, packetType);
	const existingPacket = packets[packetName];
	if (!existingPacket) throw new Error('No such packet');

	const currentState = currentVersion(state.versioned);

	const newState : VersionedDataState = {
		...currentState,
		packets: {
			...currentState.packets,
			[newPacket]: {
				data: existingPacket.data,
				lastUpdated: now(),
				collapsed: {
					collapsed: false,
					seeds: {}
				}
			}
		}
	};

	const description = `Fork ${packetType}:${packetName} to ${newPacket}`;

	return {
		...state,
		versioned: pushVersion(state.versioned, newState, description),
		currentPacketType: 'local',
		currentPacket: newPacket,
		currentSeed: pickSeedID(state.currentSeed, newPacket, newState.packets)
	};
};

export const getEnvironmentDataForContext = (state : DataState, context : EnvironmentContext) : EnvironmentData => {
	switch(context) {
	case 'global':
		return currentVersion(state.versioned).environment;
	case 'packet':
		const packets = packetsOfType(state, state.currentPacketType);
		const packet = packets[state.currentPacket];
		if (!packet) return {};
		return packet.data.environment || {};
	default:
		return assertUnreachable(context);
	}
};

const setEnvironmentDataForContext = (state : DataState, context : EnvironmentContext, environment : EnvironmentData, description: string) : DataState => {
	const currentVersionedState = currentVersion(state.versioned);
	switch(context) {
	case 'global':
		return 	{
			...state,
			versioned: pushVersion(state.versioned, {...currentVersionedState, environment}, description)
		};
	case 'packet':
		if (!packetTypeEditable(state.currentPacketType)) throw new Error(`${state.currentPacketType} is not editable`);
		const packets = currentVersionedState.packets;
		const packet = packets[state.currentPacket];
		const newPacket = {
			...packet,
			data: {
				...packet.data,
				environment
			}
		};
		const newPackets = {
			...packets,
			[state.currentPacket]: newPacket
		};
		return {
			...state,
			versioned: pushVersion(state.versioned, {...currentVersionedState, packets: newPackets}, description)
		};
	default:
		return assertUnreachable(context);
	}
};

const setEnvironmentProperty = (state : DataState, context : EnvironmentContext, key: string, value : unknown) : DataState => {
	
	const currentEnvironment = getEnvironmentDataForContext(state, context);
	const newEnvironment = {...currentEnvironment};
	let description = '';
	if (value === DELETE_SENTINEL) {
		delete newEnvironment[key];
		description = `Delete property ${key} from ${context} environment`;
	} else {
		newEnvironment[key] = value as Value;
		description = `Set property ${key} to ${String(value)} in ${context} environment`;
	}
	return setEnvironmentDataForContext(state, context, newEnvironment, description);
};

const data = (state : DataState = INITIAL_STATE, action : SomeAction) : DataState => {

	const currentVersionedState = currentVersion(state.versioned);
	const currentPackets = currentVersionedState.packets;

	switch (action.type) {
	case LOAD_ENVIRONMENT:
		return {
			...state,
			//Note: since we're using initialVersion, the description shouldn't be shown.
			versioned: initialVersion({...currentVersionedState, environment: action.environment}, 'Load environment')
		};
	case CHANGE_ENVIRONMENT_PROPERTY:
		return setEnvironmentProperty(state, action.context, action.key, action.value);
	case DELETE_ENVIRONMENT_PROPERTY:
		return setEnvironmentProperty(state, action.context, action.key, DELETE_SENTINEL);
	case LOAD_PACKETS:
		//Note: since we're using initialVersion (via the final true paremeter) the description shouldn't be shown.
		return ensureValidPacketAndSeed(setPacketsOfType(state, action.packetType, action.packets, 'Load packets', true));
	case CREATE_PACKET:
		const nnnPackets = {
			...currentPackets,
			[action.packet] : emptyWrappedSeedPacket()
		};
		return {
			...state,
			versioned: pushVersion(state.versioned, {...currentVersionedState, packets: nnnPackets}, `Create packet ${action.packet}`),
			currentPacketType: 'local',
			currentPacket: action.packet,
			currentSeed: ''
		};
	case DELETE_PACKET:
		const packets = packetsOfType(state, action.packetType);
		const newPackets = Object.fromEntries(Object.entries(packets).filter(entry => entry[0] != action.packet));
		return ensureValidPacketAndSeed(setPacketsOfType(state, action.packetType, newPackets, `Delete packet ${action.packet}`));
	case REPLACE_PACKET:
		const p = action.data as SeedPacket;
		const pName = action.packet as PacketName;
		const nPackets : Packets = {
			...currentPackets,
			[pName]: {
				...currentPackets[pName],
				lastUpdated: now(),
				data: p
			}
		};
		return {
			...state,
			versioned: pushVersion(state.versioned, {...currentVersionedState, packets: nPackets}, `Update packet ${action.packet}`),
			currentSeed: pickSeedID(state.currentSeed, state.currentPacket, nPackets)
		};
	case FORK_PACKET:
		return forkPacket(state, action.packet, action.packetType, action.newPacket);
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
		const cPacket = currentPackets[action.packet];

		const nnPackets : Packets = {
			...currentPackets,
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
		};
		return {
			...state,
			currentSeed: action.seed,
			versioned: pushVersion(state.versioned, {...currentVersionedState, packets: nnPackets}, `Create seed ${action.packet}:${action.seed}`)
		};
	case DELETE_SEED:
		return deleteSeed(state, action.packet, action.seed);
	case RENAME_SEED:
		return renameSeed(state, action.packet, action.oldName, action.newName);
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
	case UNDO:
		return {
			...state,
			versioned: undo(state.versioned)
		};
	case REDO:
		return {
			...state,
			versioned: redo(state.versioned)
		};
	default:
		return state;
	}
};

export default data;
