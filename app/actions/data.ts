import {
	AnyAction
} from 'redux';

import {
	ObjectPath,
	PacketName,
	Packets,
	PacketType
} from '../types.js';

import {
	ThunkResult
} from '../store.js';

import {
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeed,
	selectCurrentSeedID,
	selectEnvironmentData,
	selectPackets,
	selectPacketsByType,
	getPacket
} from '../selectors.js';

import {
	EnvironmentData,
	SeedID,
	SeedPacket,
} from '../../src/types.js';

import {
	getProperty
} from '../util.js';

export const LOAD_ENVIRONMENT = 'LOAD_ENVIRONMENT';
export const CHANGE_ENVIRONMENT_PROPERTY = 'CHANGE_ENVIRONMENT_PROPERTY';
export const DELETE_ENVIRONMENT_PROPERTY = 'DELETE_ENVIRONMENT_PROPERTY';
export const LOAD_PACKETS = 'LOAD_PACKETS';
export const CREATE_PACKET = 'CREATE_PACKET';
export const DELETE_PACKET = 'DELETE_PACKET';
export const REPLACE_PACKET = 'REPLACE_PACKET';
export const CREATE_SEED = 'CREATE_SEED';
export const DELETE_SEED = 'DELETE_SEED';
export const SWITCH_TO_PACKET = 'SWITCH_TO_PACKET';
export const SWITCH_TO_SEED = 'SWITCH_TO_SEED';
export const CHANGE_PROPERTY = 'CHANGE_PROPERTY';
export const DELETE_PROPERTY = 'DELETE_PROPERTY';

export const loadEnvironment = (environment : EnvironmentData) : AnyAction => {
	return {
		type: LOAD_ENVIRONMENT,
		environment
	};
};

export const changeEnvironmentProperty = (key : string, value: unknown) : AnyAction => {
	return{
		type: CHANGE_ENVIRONMENT_PROPERTY,
		key,
		value
	};
};

export const deleteEnvironmentProperty = (key : string) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentEnvironment = selectEnvironmentData(state);
	if (currentEnvironment[key] == undefined) throw new Error(`${key} is not set in environment`);
	dispatch({
		type: DELETE_ENVIRONMENT_PROPERTY,
		key
	});
};

export const loadPackets = (packets : Packets) : AnyAction => {
	return {
		type: LOAD_PACKETS,
		packets
	};
};

export const createPacket = () : ThunkResult => (dispatch) => {
	const name = prompt('What should the packet be named?');
	if (!name) return;
	dispatch(createNamedPacket(name));
};

export const createNamedPacket = (name : PacketName) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packetsByType = selectPacketsByType(state);
	const packet = getPacket(packetsByType, name, 'local');
	if (packet === undefined) throw new Error(`${name} already exists`);
	dispatch({
		type: CREATE_PACKET,
		packet: name
	});
};

export const replacePacket = (name : PacketName, packetType : PacketType, packet : SeedPacket) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packetsByType = selectPacketsByType(state);
	const currentPacket = getPacket(packetsByType, name, packetType);
	if (currentPacket === undefined) throw new Error(`${name} did not exist`);
	dispatch({
		type: REPLACE_PACKET,
		packet: name,
		packetType,
		data: packet
	});
};

export const deleteCurrentPacket = () : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const packetType = selectCurrentPacketType(state);
	dispatch(deletePacket(currentPacket, packetType));
};

export const deletePacket = (name : PacketName, packetType : PacketType) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packetsByType = selectPacketsByType(state);
	const packet = getPacket(packetsByType, name, packetType);
	if (packet === undefined) throw new Error(`${name} already did not exist`);
	if (!confirm(`Are you sure you want to delete packet ${name}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_PACKET,
		packetType,
		packet: name
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
	const packetsByType = selectPacketsByType(state);
	const packet = getPacket(packetsByType, existingPacket, packetType);
	if (packet === undefined) throw new Error(`${existingPacket} already did not exist`);
	dispatch({
		type: CREATE_PACKET,
		packet: newName
	});
	dispatch({
		type: REPLACE_PACKET,
		packet: newName,
		data: packet
	});
};

export const createSeed = () : ThunkResult => (dispatch, getState) => {
	const name = prompt('What should the seed be named?');
	if (!name) return;
	const currentPacketName = selectCurrentPacketName(getState());
	dispatch(createNamedSeed(currentPacketName, name));
};

export const createNamedSeed = (packetName: PacketName, name : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packets = selectPackets(state);
	const packet = packets[packetName];
	if (!packet) throw new Error(`${packetName} packet did not exist`);
	if (packet.seeds[name] !== undefined) throw new Error(`${name} already exists`);
	dispatch({
		type: CREATE_SEED,
		packet: packetName,
		seed: name
	});
};

export const deleteCurrentSeed = () : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const packetType = selectCurrentPacketType(state);
	const currentSeed = selectCurrentSeedID(state);
	dispatch(deleteSeed(currentPacket, packetType, currentSeed));
};

export const deleteSeed = (packetName: PacketName, packetType : PacketType, seedID : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packetsByType = selectPacketsByType(state);
	const packet = getPacket(packetsByType, packetName, packetType);
	if (packet === undefined) throw new Error(`Packet ${packetName} did not exist`);
	if (packet.seeds[seedID] === undefined) throw new Error(`Seed ${seedID} already did not exist`);
	if (!confirm(`Are you sure you want to delete seed ${seedID}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_SEED,
		packetType,
		packet: packetName,
		seed: seedID
	});
};

export const switchToPacket = (name : PacketName, packetType : PacketType) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const currentPacketType = selectCurrentPacketType(state);
	if (currentPacket == name && currentPacketType == packetType) return;
	const packetsByType = selectPacketsByType(state);
	const packet = getPacket(packetsByType, name, packetType);
	if (packet === undefined) throw new Error(`No such packet with name ${name}`);
	dispatch({
		type: SWITCH_TO_PACKET,
		packet: name,
		packetType
	});
};

export const switchToSeedInCurrentPacket = (seed : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const packetType = selectCurrentPacketType(state);
	dispatch(switchToSeed(currentPacket, packetType, seed));
};

export const switchToSeed = (packetName: PacketName, packetType : PacketType, seed : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packetsByType = selectPacketsByType(state);
	const packet = getPacket(packetsByType, packetName, packetType);
	if (!packet) throw new Error(`${packetName} did not exist as a packet`);
	if (packet.seeds[seed] === undefined) throw new Error(`${seed} did not exist in current packet`);
	dispatch({
		type: SWITCH_TO_SEED,
		packet: packetName,
		packetType,
		seed
	});
};

export const changeProperty = (path : ObjectPath, value: unknown) : ThunkResult => (dispatch, getState) => {
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

export const deleteProperty = (path : ObjectPath) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentSeed = selectCurrentSeed(state);
	//This will throw if that path is not valid
	getProperty(currentSeed, path);
	dispatch({
		type: DELETE_PROPERTY,
		path
	});
};