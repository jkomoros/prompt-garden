import {
	SeedID
} from '../src/types.js';

import {
	ObjectPath,
	PacketName
} from './types.js';

const CURRENT_PACKET_CHANGED_EVENT_NAME = 'current-packet-changed';
const CREATE_PACKET_NAME = 'create-packet';
const DELETE_PACKET_EVENT_NAME = 'delete-packet';
const CURRENT_SEED_ID_CHANGED_EVENT_NAME = 'current-seed-changed';
const PROPERTY_CHANGED_EVENT_NAME = 'property-changed';

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

export type DeletePacketEvent = CustomEvent<CurrentPacketEventDetail>;

export const makeDeletePacketEvent = (name : PacketName) : DeletePacketEvent => {
	return new CustomEvent(DELETE_PACKET_EVENT_NAME, {composed: true, detail: {name : name}});
};

type CurrentSeedEventDetail = {
	seed: SeedID
}

export type CurrentSeedIDChangedEvent = CustomEvent<CurrentSeedEventDetail>;

export const makeCurrentSeedIDChangedEvent = (seedID : SeedID) : CurrentSeedIDChangedEvent => {
	return new CustomEvent(CURRENT_SEED_ID_CHANGED_EVENT_NAME, {composed: true, detail: {seed: seedID}});
};

type PropertyChangedEventDetail = {
	path : ObjectPath,
	newValue: unknown
}

export type PropertyChangedEvent = CustomEvent<PropertyChangedEventDetail>;

export const makePropertyChangedEvent = (path : ObjectPath, value: unknown) => {
	return new CustomEvent(PROPERTY_CHANGED_EVENT_NAME, {composed: true, detail: {path, newValue: value}});
};