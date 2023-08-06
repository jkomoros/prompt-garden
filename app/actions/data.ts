import {
	AnyAction
} from 'redux';

import {
	Packets
} from '../types.js';

import {
	ThunkResult
} from '../store.js';

import {
	selectCurrentPacket, selectPackets
} from '../selectors.js';

export const LOAD_PACKETS = 'LOAD_PACKETS';
export const CREATE_PACKET = 'CREATE_PACKET';
export const DELETE_PACKET = 'DELETE_PACKET';
export const SWITCH_TO_PACKET = 'SWITCH_TO_PACKET';

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

export const deletePacket = (name : string) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const packets = selectPackets(state);
	if (packets[name] === undefined) throw new Error(`${name} already did not exist`);
	dispatch({
		type: DELETE_PACKET,
		name
	});
};

export const switchToPacket = (name : string) : ThunkResult => (dispatch, getState) => {
	const state = getState();
	const currentPacket = selectCurrentPacket(state);
	if (currentPacket == name) return;
	const packets = selectPackets(state);
	if (packets[name] === undefined) throw new Error(`No such packet with name ${name}`);
	dispatch({
		type: SWITCH_TO_PACKET,
		name
	});
};