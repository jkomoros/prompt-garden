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
	CHANGE_PROPERTY,
	DELETE_PROPERTY,
	ActionLoadEnvironment,
	ActionChangeEnvironmentProperty,
	ActionLoadPackets,
} from '../actions.js';

import {
	ObjectPath,
	PacketName,
	Packets,
	PacketType
} from '../types.js';

import {
	ThunkResult,
	ThunkSomeAction
} from '../store.js';

import {
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeed,
	selectCurrentSeedID,
	selectEnvironmentData,
	selectPackets,
	selectPacketsBundle
} from '../selectors.js';

import {
	EnvironmentData,
	SeedID,
	seedPacket,
	SeedPacket,
	SeedPacketAbsoluteLocation,
	seedPacketLocation,
	SeedPacketLocation,
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

export const loadEnvironment = (environment : EnvironmentData) : ActionLoadEnvironment => {
	return {
		type: LOAD_ENVIRONMENT,
		environment
	};
};

export const changeEnvironmentProperty = (key : string, value: unknown) : ActionChangeEnvironmentProperty => {
	return{
		type: CHANGE_ENVIRONMENT_PROPERTY,
		key,
		value
	};
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

export const importPacket = (location? : SeedPacketLocation) : ThunkSomeAction => async (dispatch, getState) => {
	
	const state = getState();
	const bundle = selectPacketsBundle(state);

	if (location === undefined) {
		//TODO: better and more helpful text that explains the kinds of options
		const providedLocation = prompt('What is the location of the packet to load?', 'example-basic.json');
		if (!providedLocation) throw new Error('No location provided');
		location = seedPacketLocation.parse(providedLocation);
	}

	const absoluteLocation = makeSeedPacketLocationAbsolute(location);

	const existingPacket = getPacket(bundle, absoluteLocation, 'remote');
	if (existingPacket) throw new Error(`A remote packet from location ${absoluteLocation} already exists`);

	const packet = await fetchSeedPacket(absoluteLocation);

	dispatch({
		type: IMPORT_PACKET,
		location: absoluteLocation,
		data: packet
	});
};

export const forkPacket = (existingPacket : PacketName, packetType : PacketType) : ThunkResult => (dispatch) => {
	//TODO: the new name should slide the _copy in before the .json if it exists
	const newName = prompt('What should the new packet be called?', existingPacket + '_copy');
	if (!newName) throw new Error('No name provided');
	dispatch(forkNamedPacket(existingPacket, packetType, newName));
};

export const forkNamedPacket = (existingPacket : PacketName, packetType : PacketType, newName : PacketName) : ThunkResult => (dispatch, getState) => {
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

export const switchToSeed = (packetName: PacketName, packetType : PacketType, seed : SeedID) : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const bundle = selectPacketsBundle(state);
	const packet = getPacket(bundle, packetName, packetType);
	if (!packet) throw new Error(`${packetName} did not exist as a packet`);
	if (packet.data.seeds[seed] === undefined) throw new Error(`${seed} did not exist in current packet`);
	dispatch({
		type: SWITCH_TO_SEED,
		packet: packetName,
		packetType,
		seed
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
		await dispatch(importPacket(file));
	}
	await dispatch(createNamedPacket('starter'));
	await dispatch(createNamedSeed('starter', 'example'));
	setFirstRunComplete();
};