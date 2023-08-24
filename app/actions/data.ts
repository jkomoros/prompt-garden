import {
	AnyAction
} from 'redux';

import {
	ObjectPath,
	PacketName,
	Packets,
	RootState
} from '../types.js';

import {
	ThunkResult
} from '../store.js';

import {
	selectCurrentPacketName,
	selectCurrentPacketRemote,
	selectCurrentSeed,
	selectCurrentSeedID,
	selectEnvironmentData,
	selectPackets
} from '../selectors.js';

import {
	EnvironmentData,
	SeedID,
	SeedPacket
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

const getPacket = (state : RootState, name : PacketName, remote : boolean) : SeedPacket => {
	if (remote) throw new Error('remote not yet supported');
	const packets = selectPackets(state);
	return packets[name];
};

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
	const packet = getPacket(state, name, false);
	if (packet === undefined) throw new Error(`${name} already exists`);
	dispatch({
		type: CREATE_PACKET,
		packet: name
	});
};

export const replacePacket = (name : PacketName, remote: boolean, packet : SeedPacket) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = getPacket(state, name, remote);
	if (currentPacket === undefined) throw new Error(`${name} did not exist`);
	dispatch({
		type: REPLACE_PACKET,
		packet: name,
		remote,
		data: packet
	});
};

export const deleteCurrentPacket = () : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const remote = selectCurrentPacketRemote(state);
	dispatch(deletePacket(currentPacket, remote));
};

export const deletePacket = (name : PacketName, remote : boolean) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packet = getPacket(state, name, remote);
	if (packet === undefined) throw new Error(`${name} already did not exist`);
	if (!confirm(`Are you sure you want to delete packet ${name}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_PACKET,
		remote,
		packet: name
	});
};

export const forkPacket = (existingPacket : PacketName, remote : boolean) : ThunkResult => (dispatch) => {
	//TODO: the new name should slide the _copy in before the .json if it exists
	const newName = prompt('What should the new packet be called?', existingPacket + '_copy');
	if (!newName) throw new Error('No name provided');
	dispatch(forkNamedPacket(existingPacket, remote, newName));
};

export const forkNamedPacket = (existingPacket : PacketName, remote : boolean, newName : PacketName) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packet = getPacket(state, existingPacket, remote);
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
	const remote = selectCurrentPacketRemote(state);
	const currentSeed = selectCurrentSeedID(state);
	dispatch(deleteSeed(currentPacket, remote, currentSeed));
};

export const deleteSeed = (packetName: PacketName, remote: boolean, seedID : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packet = getPacket(state, packetName, remote);
	if (packet === undefined) throw new Error(`Packet ${packetName} did not exist`);
	if (packet.seeds[seedID] === undefined) throw new Error(`Seed ${seedID} already did not exist`);
	if (!confirm(`Are you sure you want to delete seed ${seedID}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_SEED,
		remote,
		packet: packetName,
		seed: seedID
	});
};

export const switchToPacket = (name : PacketName, remote : boolean) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const currentPacketRemote = selectCurrentPacketRemote(state);
	if (currentPacket == name && currentPacketRemote == remote) return;
	const packet = getPacket(state, name, remote);
	if (packet === undefined) throw new Error(`No such packet with name ${name}`);
	dispatch({
		type: SWITCH_TO_PACKET,
		packet: name,
		remote
	});
};

export const switchToSeedInCurrentPacket = (seed : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	const remote = selectCurrentPacketRemote(state);
	dispatch(switchToSeed(currentPacket, remote, seed));
};

export const switchToSeed = (packetName: PacketName, remote: boolean, seed : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packet = getPacket(state, packetName, remote);
	if (!packet) throw new Error(`${packetName} did not exist as a packet`);
	if (packet.seeds[seed] === undefined) throw new Error(`${seed} did not exist in current packet`);
	dispatch({
		type: SWITCH_TO_SEED,
		packet: packetName,
		remote,
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