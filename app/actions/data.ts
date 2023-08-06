import {
	AnyAction
} from 'redux';

import {
	Packets
} from '../types.js';

export const LOAD_PACKETS = 'LOAD_PACKETS';
export const CREATE_PACKET = 'CREATE_PACKET';

export const loadPackets = (packets : Packets) : AnyAction => {
	return {
		type: LOAD_PACKETS,
		packets
	};
};

export const createPacket = (name : string) : AnyAction => {
	return {
		type: CREATE_PACKET,
		name
	};
};