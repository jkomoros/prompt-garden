import {
	PacketName
} from './types.js';

const CURRENT_PACKET_CHANGED_EVENT_NAME = 'current-packet-changed';
const CREATE_PACKET_NAME = 'create-packet';

type CurrentPacketEventDetail = {
	name: PacketName
}

export type CurrentPacketChangedEvent = CustomEvent<CurrentPacketEventDetail>;

export const makeCurrentPacketChangedEvent = (packetName : PacketName) : CurrentPacketChangedEvent => {
	return new CustomEvent(CURRENT_PACKET_CHANGED_EVENT_NAME, {composed: true, detail: {name: packetName}});
};

export type CreatePacketEvent = CustomEvent<null>;

export const makeCreatePacketEvent = () : CreatePacketEvent => {
	return new CustomEvent(CREATE_PACKET_NAME, {composed: true});
};