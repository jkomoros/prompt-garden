import {
	SeedID, SeedReference
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
const PROPERTY_DELETED_EVENT_NAME = 'property-deleted';
const SHOW_EDIT_JSON_EVENT_NAME = 'show-edit-json';
const RUN_SEED_EVENT_NAME = 'run-seed';

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

type SeedAction = 'select';

type SeedEventDetail = {
	seed: SeedID,
	action: SeedAction
}

export type SeedEvent = CustomEvent<SeedEventDetail>;

export const makeCurrentSeedIDChangedEvent = (seedID : SeedID) : SeedEvent => {
	return new CustomEvent(CURRENT_SEED_ID_CHANGED_EVENT_NAME, {composed: true, detail: {seed: seedID, action: 'select'}});
};

type PropertyChangedEventDetail = {
	path : ObjectPath,
	newValue: unknown
}

export type PropertyChangedEvent = CustomEvent<PropertyChangedEventDetail>;

export const makePropertyChangedEvent = (path : ObjectPath, value: unknown) : PropertyChangedEvent => {
	return new CustomEvent(PROPERTY_CHANGED_EVENT_NAME, {composed: true, detail: {path, newValue: value}});
};

type PropertyDeletedEventDetail = {
	path : ObjectPath
}

export type PropertyDeletedEvent = CustomEvent<PropertyDeletedEventDetail>;

export const makePropertyDeletedEvent = (path : ObjectPath) : PropertyDeletedEvent => {
	return new CustomEvent(PROPERTY_DELETED_EVENT_NAME, {composed: true, detail: {path}});
};

export type ShowEditJSONEvent = CustomEvent<undefined>;

export const makeShowEditJSONEvent = () : ShowEditJSONEvent => {
	return new CustomEvent(SHOW_EDIT_JSON_EVENT_NAME, {composed: true});
};

export type RunSeedEvent = CustomEvent<SeedReference>;

export const makeRunSeedEvent = (packet: PacketName, seed: SeedID) : RunSeedEvent => {
	return new CustomEvent(RUN_SEED_EVENT_NAME, {composed: true, detail: {packet, seed}});
};