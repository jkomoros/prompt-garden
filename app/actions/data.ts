import {
	LOAD_ENVIRONMENT,
	CHANGE_ENVIRONMENT_PROPERTY,
	DELETE_ENVIRONMENT_PROPERTY,
	LOAD_PACKETS,
	CREATE_PACKET,
	DELETE_PACKET,
	REPLACE_PACKET,
	IMPORT_PACKET,
	CREATE_SEED,
	DELETE_SEED,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED,
	COLLAPSE_PROPERTY,
	CHANGE_PROPERTY,
	DELETE_PROPERTY,
	ActionLoadEnvironment,
	ActionLoadPackets,
	SET_PACKET_COLLAPSED,
} from '../actions.js';

import {
	ObjectPath,
	PacketName,
	Packets,
	PacketsBundle,
	PacketType,
	SeedSelector
} from '../types.js';

import {
	ThunkSomeAction
} from '../store.js';

import {
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeed,
	selectCurrentSeedID,
	selectCurrentSeedSelector,
	selectEnvironmentData,
	selectPackets,
	selectPacketsBundle
} from '../selectors.js';

import {
	environmentData,
	EnvironmentData,
	SeedID,
	seedPacket,
	SeedPacket,
	SeedPacketAbsoluteLocation,
	seedPacketLocation,
	SeedPacketLocation,
	value,
} from '../../src/types.js';

import {
	getProperty,
	getPacket,
	isFirstRun,
	setFirstRunComplete
} from '../util.js';

import {
	makeLocationAbsolute
} from '../../src/reference.js';

import {
	knownSeedFiles
	//If this doesn't exist, run `npm run generate:config` to generate it.
} from '../listing.GENERATED.js';

import {
	TypedObject
} from '../../src/typed-object.js';

import {
	ZodError
} from 'zod';

export const loadEnvironment = (environment : EnvironmentData) : ActionLoadEnvironment => {
	return {
		type: LOAD_ENVIRONMENT,
		environment
	};
};

export const changeEnvironmentProperty = (key : string, rawValue: unknown) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const v = value.parse(rawValue);

	const newEnv = {
		...selectEnvironmentData(state),
		[key]: v
	};

	try {
		//Throw if the new value is not valid.
		environmentData.parse(newEnv);
	} catch(err) {
		if (err instanceof ZodError) {
			alert(`Could not set value: ${err.errors[0].message}`);
		} else {
			alert(err);
		}
		return;
	}

	dispatch({
		type: CHANGE_ENVIRONMENT_PROPERTY,
		key,
		value: v
	});
};

export const deleteEnvironmentProperty = (key : string) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentEnvironment = selectEnvironmentData(state);
	if (currentEnvironment[key] == undefined) throw new Error(`${key} is not set in environment`);
	dispatch({
		type: DELETE_ENVIRONMENT_PROPERTY,
		key
	});
};

export const loadPackets = (packets : Packets, packetType : PacketType) : ActionLoadPackets => {
	return {
		type: LOAD_PACKETS,
		packets,
		packetType
	};
};

export const createPacket = () : ThunkSomeAction => (dispatch) => {
	const name = prompt('What should the packet be named?');
	if (!name) return;
	dispatch(createNamedPacket(name));
};

export const createNamedPacket = (name : PacketName) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, name, 'local');
	if (packet !== undefined) throw new Error(`${name} already exists`);
	dispatch({
		type: CREATE_PACKET,
		packet: name
	});
};

export const replacePacket = (name : PacketName, packetType : PacketType, packet : SeedPacket) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const currentPacket = getPacket(bundle, name, packetType);
	if (currentPacket === undefined) throw new Error(`${name} did not exist`);
	dispatch({
		type: REPLACE_PACKET,
		packet: name,
		packetType,
		data: packet
	});
};

export const deleteCurrentPacket = () : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const packetType = selectCurrentPacketType(state);
	dispatch(deletePacket(currentPacket, packetType));
};

export const deletePacket = (name : PacketName, packetType : PacketType) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, name, packetType);
	if (packet === undefined) throw new Error(`${name} already did not exist`);
	if (!confirm(`Are you sure you want to ${packetType == 'remote' ? 'disconnect' : 'delete'} packet ${name}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_PACKET,
		packetType,
		packet: name
	});
};

const makeSeedPacketLocationAbsolute = (rawLocation : SeedPacketLocation) : SeedPacketAbsoluteLocation => {
	//TODO: if it already is local and has seeds don't have it in there twise

	//a relative location has to start with a relative location
	if (!rawLocation.startsWith('http')) rawLocation = './' + rawLocation;
	//The makeLocationAbsolute machinery assumes the location is a valid location
	const base = window.location.origin + '/seeds/example-basic.json';
	return makeLocationAbsolute(rawLocation, base);
};

const fetchSeedPacket = async (location : SeedPacketAbsoluteLocation) : Promise<SeedPacket> => {
	//Local locations should be relative to seeds

	//TODO: shouldn't this just be a util the main package exports?
	const result = await fetch(location, {
		method: 'GET'
	});
	const blob = await result.json();
	return seedPacket.parse(blob);
};

export const importPacket = (location? : SeedPacketLocation, collapsed = false) : ThunkSomeAction => async (dispatch) => {
	
	if (location === undefined) {
		//TODO: better and more helpful text that explains the kinds of options
		const providedLocation = prompt('What is the location of the packet to load?', 'example-basic.json');
		if (!providedLocation) throw new Error('No location provided');
		location = seedPacketLocation.parse(providedLocation);
	}

	const absoluteLocation = makeSeedPacketLocationAbsolute(location);

	const packet = await fetchSeedPacket(absoluteLocation);

	//Even though we have a single straightforward dispatch, we still use thunk
	//because we need an await.
	dispatch({
		type: IMPORT_PACKET,
		location: absoluteLocation,
		data: packet,
		collapsed
	});
};

export const forkPacket = (existingPacket : PacketName, packetType : PacketType) : ThunkSomeAction => (dispatch) => {
	//TODO: the new name should slide the _copy in before the .json if it exists
	const newName = prompt('What should the new packet be called?', existingPacket + '_copy');
	if (!newName) throw new Error('No name provided');
	dispatch(forkNamedPacket(existingPacket, packetType, newName));
};

export const forkNamedPacket = (existingPacket : PacketName, packetType : PacketType, newName : PacketName) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, existingPacket, packetType);
	if (packet === undefined) throw new Error(`${existingPacket} already did not exist`);
	dispatch({
		type: CREATE_PACKET,
		packet: newName
	});
	dispatch({
		type: REPLACE_PACKET,
		packetType,
		packet: newName,
		data: packet.data
	});
};

export const createSeed = () : ThunkSomeAction => (dispatch, getState) => {
	const name = prompt('What should the seed be named?');
	if (!name) return;
	const currentPacketName = selectCurrentPacketName(getState());
	dispatch(createNamedSeed(currentPacketName, name));
};

export const createNamedSeed = (packetName: PacketName, name : SeedID) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const packets = selectPackets(state);
	const packet = packets[packetName];
	if (!packet) throw new Error(`${packetName} packet did not exist`);
	if (packet.data.seeds[name] !== undefined) throw new Error(`${name} already exists`);
	dispatch({
		type: CREATE_SEED,
		packet: packetName,
		seed: name
	});
};

export const deleteCurrentSeed = () : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const packetType = selectCurrentPacketType(state);
	const currentSeed = selectCurrentSeedID(state);
	dispatch(deleteSeed(currentPacket, packetType, currentSeed));
};

export const deleteSeed = (packetName: PacketName, packetType : PacketType, seedID : SeedID) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, packetName, packetType);
	if (packet === undefined) throw new Error(`Packet ${packetName} did not exist`);
	if (packet.data.seeds[seedID] === undefined) throw new Error(`Seed ${seedID} already did not exist`);
	if (!confirm(`Are you sure you want to delete seed ${seedID}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_SEED,
		packetType,
		packet: packetName,
		seed: seedID
	});
};

export const setPacketCollapsed = (packetName: PacketName, packetType: PacketType, collapsed : boolean) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, packetName, packetType);
	if (packet === undefined) throw new Error(`Packet ${packetName} did not exist`);
	dispatch({
		type: SET_PACKET_COLLAPSED,
		packet: packetName,
		packetType,
		collapsed
	});
};

export const switchToPacket = (name : PacketName, packetType : PacketType) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const currentPacketType = selectCurrentPacketType(state);
	if (currentPacket == name && currentPacketType == packetType) return;
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, name, packetType);
	if (packet === undefined) throw new Error(`No such packet with name ${name}`);
	dispatch({
		type: SWITCH_TO_PACKET,
		packet: name,
		packetType
	});
};

export const switchToSeedInCurrentPacket = (seed : SeedID) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const packetType = selectCurrentPacketType(state);
	dispatch(switchToSeed(currentPacket, packetType, seed));
};

const maybeThrow = (msg : string, noThrow = false) => {
	if (noThrow) {
		console.warn('Error that would have been thrown:\n' + msg);
		return;
	}
	throw new Error(msg);
};

export const switchToSeed = (packetName: PacketName, packetType : PacketType, seed : SeedID, noThrow = false) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();

	const currentPacketName = selectCurrentPacketName(state);
	const currentPacketType = selectCurrentPacketType(state);
	const currentSeedID = selectCurrentSeedID(state);
	//In this case it's a no op
	if (currentPacketName == packetName && currentPacketType == packetType && currentSeedID == seed) return;

	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, packetName, packetType);
	if (!packet) return maybeThrow(`${packetName} did not exist as a packet`, noThrow);
	if (packet.data.seeds[seed] === undefined) return maybeThrow(`${seed} did not exist in current packet`, noThrow);

	dispatch({
		type: SWITCH_TO_SEED,
		packet: packetName,
		packetType,
		seed
	});
};

const seedSelectorsEquivalent = (a : SeedSelector, b : SeedSelector) : boolean => {
	if (a.packetType != b.packetType) return false;
	if (a.packetName != b.packetName) return false;
	if (a.seedID != b.seedID) return false;
	return true;
};

//Returns the new selector, and a boolean of if ran to the extreme and couldn't make a change.
const adjacentSeed = (bundle : PacketsBundle, current : SeedSelector, prev : boolean) : [SeedSelector, boolean] => {
	//Instead of really finicky nested iterator logic, our approach will be to:
	//1) Enumerate all type/packet/seed combinations in order.
	//2) Walk the enumeration until we find the current one
	//3) Change the index by one and return, handling off-the-end specially.
	const allSelectors : SeedSelector[] = [];

	//Enumerate all seeds
	for (const [packetType, packets] of TypedObject.entries(bundle)) {
		for (const [packetName, packet] of TypedObject.entries(packets)) {
			for (const seedID of TypedObject.keys(packet.data.seeds)) {
				allSelectors.push({
					packetType,
					packetName,
					seedID
				});
			}
		}
	}

	const index = allSelectors.findIndex(selector => seedSelectorsEquivalent(current, selector));
	if (index < 0) throw new Error('Current selector is not valid');
	const newIndex = index + (prev ? -1 : 1);

	//Extremity check
	if (newIndex < 0 || newIndex >= allSelectors.length) return [current, true];

	return [allSelectors[newIndex], false];

};

export const switchToAdjacentSeed = (prev : boolean) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();

	const bundle = selectPacketsBundle(state);
	const selector = selectCurrentSeedSelector(state);

	const [newSelector, hitEnd] = adjacentSeed(bundle,selector,prev);

	if (hitEnd) return;

	dispatch(switchToSeed(newSelector.packetName, newSelector.packetType, newSelector.seedID));

};

export const collapseProperty = (path : ObjectPath, collapsed : boolean) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentSeed = selectCurrentSeed(state);
	//This will throw if that path is not valid
	getProperty(currentSeed, path);
	dispatch({
		type: COLLAPSE_PROPERTY,
		path,
		collapsed
	});
};

export const changeProperty = (path : ObjectPath, value: unknown) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentSeed = selectCurrentSeed(state);
	//This will throw if that path is not valid
	getProperty(currentSeed, path);
	dispatch({
		type: CHANGE_PROPERTY,
		path,
		value
	});
};

export const deleteProperty = (path : ObjectPath) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const currentSeed = selectCurrentSeed(state);
	//This will throw if that path is not valid
	getProperty(currentSeed, path);
	dispatch({
		type: DELETE_PROPERTY,
		path
	});
};

export const firstRunIfNecessary = () : ThunkSomeAction => async (dispatch) => {
	if (!isFirstRun()) return;
	for (const file of TypedObject.keys(knownSeedFiles.enum)) {
		await dispatch(importPacket(file, true));
	}
	await dispatch(createNamedPacket('starter'));
	await dispatch(createNamedSeed('starter', 'example'));
	setFirstRunComplete();
};