import {
	SeedPacket
} from '../src/types.js';

import {
	assertUnreachable
} from '../src/util.js';

import {
	PacketName,
	PacketType,
	Packets,
	PacketsBundle
} from './types.js';

export const packetTypeEditable = (packetType : PacketType) : boolean => {
	switch(packetType) {
	case 'local':
		return true;
	case 'remote':
		return false;
	default:
		return assertUnreachable(packetType);
	}
};

export const getPacket = (bundle : PacketsBundle, name : PacketName, packetType : PacketType) : SeedPacket => {

	let packets : Packets = {};

	//TODO: can't this just be something like byType[packetType]?

	switch (packetType) {
	case 'local':
		packets = bundle.local;
		break;
	case 'remote':
		packets = bundle.remote;
		break;
	default:
		assertUnreachable(packetType);
	}

	return packets[name];
};