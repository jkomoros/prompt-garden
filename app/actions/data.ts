import {
	AnyAction
} from 'redux';

import {
	ObjectPath,
	Packets
} from '../types.js';

import {
	ThunkResult
} from '../store.js';

import {
	selectCurrentPacket,
	selectCurrentPacketName,
	selectCurrentSeed,
	selectPackets
} from '../selectors.js';

import {
	SeedID,
	SeedPacket
} from '../../src/types.js';

import {
	getProperty
} from '../util.js';

export const LOAD_PACKETS = 'LOAD_PACKETS';
export const CREATE_PACKET = 'CREATE_PACKET';
export const DELETE_PACKET = 'DELETE_PACKET';
export const REPLACE_PACKET = 'REPLACE_PACKET';
export const SWITCH_TO_PACKET = 'SWITCH_TO_PACKET';
export const SWITCH_TO_SEED = 'SWITCH_TO_SEED';
export const CHANGE_PROPERTY = 'CHANGE_PROPERTY';

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

export const createNamedPacket = (name : string) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packets = selectPackets(state);
	if (packets[name] !== undefined) throw new Error(`${name} already exists`);
	dispatch({
		type: CREATE_PACKET,
		name
	});
};

export const replacePacket = (name : string, packet : SeedPacket) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packets = selectPackets(state);
	if (packets[name] === undefined) throw new Error(`${name} did not exist`);
	dispatch({
		type: REPLACE_PACKET,
		name,
		packet
	});
};

export const deleteCurrentPacket = () : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	dispatch(deletePacket(currentPacket));
};

export const deletePacket = (name : string) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packets = selectPackets(state);
	if (packets[name] === undefined) throw new Error(`${name} already did not exist`);
	if (!confirm(`Are you sure you want to delete packet ${name}? This action cannot be undone.`)) return;
	dispatch({
		type: DELETE_PACKET,
		name
	});
};

export const switchToPacket = (name : string) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacketName(state);
	if (currentPacket == name) return;
	const packets = selectPackets(state);
	if (packets[name] === undefined) throw new Error(`No such packet with name ${name}`);
	dispatch({
		type: SWITCH_TO_PACKET,
		name
	});
};

export const switchToSeed = (seed : SeedID) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacket(state);
	if (currentPacket.seeds[seed] === undefined) throw new Error(`${seed} did not exist in current packet`);
	dispatch({
		type: SWITCH_TO_SEED,
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