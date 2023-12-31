import {
	SeedID,
	SeedPacketLocation,
	SeedReference
} from '../src/types.js';

import {
	EnvironmentContext,
	ObjectPath,
	PacketName,
	PacketType
} from './types.js';

const CURRENT_PACKET_CHANGED_EVENT_NAME = 'current-packet-changed';
const CREATE_PACKET_NAME = 'create-packet';
const DELETE_PACKET_EVENT_NAME = 'delete-packet';
const FORK_PACKET_EVENT_NAME = 'fork-packet';
const DOWNLOAD_PACKET_EVENT_NAME = 'download-packet';
const DOWNLOAD_ALL_PACKETS_EVENT_NAME = 'download-all-packets';
const COLLAPSE_PACKET_EVENT_NAME = 'collapse-packet';
const CURRENT_SEED_ID_CHANGED_EVENT_NAME = 'current-seed-changed';
const CREATE_SEED_EVENT_NAME = 'create-seed';
const DELETE_SEED_EVENT_NAME = 'delete-seed';
const RENAME_SEED_EVENT_NAME = 'rename-seed';
const IMPORT_PACKET_EVENT_NAME = 'import-packet';
const PROPERTY_COLLAPSED_EVENT_NAME = 'property-collapsed';
const PROPERTY_CHANGED_EVENT_NAME = 'property-changed';
const PROPERTY_DELETED_EVENT_NAME = 'property-deleted';
const PROPERTY_MOVED_EVENT_NAME = 'property-moved';
const ENVIRONMENT_CHANGED_EVENT_NAME = 'environment-changed';
const ENVIRONMENT_DELETED_EVENT_NAME = 'environment-deleted';
const SHOW_EDIT_JSON_EVENT_NAME = 'show-edit-json';
const RUN_SEED_EVENT_NAME = 'run-seed';
const DIALOG_SHOULD_CLOSE_EVENT_NAME = 'dialog-should-close';
const UNDO_EVENT_NAME = 'undo';
const REDO_EVENT_NAME = 'redo';

type CurrentPacketEventDetail = {
	name: PacketName,
	packetType: PacketType
}

export type CurrentPacketEvent = CustomEvent<CurrentPacketEventDetail>;

export const makeCurrentPacketChangedEvent = (packetName : PacketName, packetType : PacketType) : CurrentPacketEvent => {
	return new CustomEvent(CURRENT_PACKET_CHANGED_EVENT_NAME, {composed: true, detail: {name: packetName, packetType}});
};

type PacketCollapsedEventDetail = CurrentPacketEventDetail & {
	collapsed: boolean
}

export type PacketCollapsedEvent = CustomEvent<PacketCollapsedEventDetail>;

export const makePacketCollapsedEvent = (packetName : PacketName, packetType : PacketType, collapsed : boolean) : PacketCollapsedEvent => {
	return new CustomEvent(COLLAPSE_PACKET_EVENT_NAME, {composed: true, detail: {name: packetName, packetType, collapsed}});
};

export const makeCreatePacketEvent = () : CustomEvent<null> => {
	return new CustomEvent(CREATE_PACKET_NAME, {composed: true});
};

export const makeDeletePacketEvent = (name : PacketName, packetType: PacketType) : CurrentPacketEvent => {
	return new CustomEvent(DELETE_PACKET_EVENT_NAME, {composed: true, detail: {name, packetType}});
};

export const makeForkPacketEvent = (name : PacketName, packetType : PacketType) : CurrentPacketEvent => {
	return new CustomEvent(FORK_PACKET_EVENT_NAME, {composed: true, detail: {name, packetType}});
};

export const makeDownloadPacketEvent = (name : PacketName, packetType : PacketType) : CurrentPacketEvent => {
	return new CustomEvent(DOWNLOAD_PACKET_EVENT_NAME, {composed: true, detail: {name, packetType}});
};

export const makeDownloadAllPacketsEvent = () : CustomEvent<null> => {
	return new CustomEvent(DOWNLOAD_ALL_PACKETS_EVENT_NAME, {composed: true});
};

type SeedEventDetail = {
	seed: SeedID,
	packet: PacketName,
	packetType: PacketType,
	action: 'delete' | 'select' | 'create'
};

export type SeedEvent = CustomEvent<SeedEventDetail>;

export const makeCurrentSeedIDChangedEvent = (packet: PacketName, packetType : PacketType, seedID : SeedID) : SeedEvent => {
	return new CustomEvent(CURRENT_SEED_ID_CHANGED_EVENT_NAME, {composed: true, detail: {packet, packetType, seed: seedID, action: 'select'}});
};

export const makeCreateSeedIDEvent = (packet: PacketName, packetType : PacketType, seedID : SeedID) : SeedEvent => {
	return new CustomEvent(CREATE_SEED_EVENT_NAME, {composed: true, detail: {packet, packetType, seed: seedID, action: 'create'}});
};

export const makeDeleteSeedIDEvent = (packet: PacketName, packetType : PacketType, seedID : SeedID) : SeedEvent => {
	return new CustomEvent(DELETE_SEED_EVENT_NAME, {composed: true, detail: {seed: seedID, packetType, packet, action: 'delete'}});
};

type RenameSeedEventDetail = {
	oldName: SeedID,
	newName: SeedID,
	packet: PacketName
};

export type RenameSeedEvent = CustomEvent<RenameSeedEventDetail>;

export const makeRenameSeedIDEvent = (packet: PacketName, oldName : SeedID, newName : SeedID) : RenameSeedEvent => {
	return new CustomEvent(RENAME_SEED_EVENT_NAME, {composed: true, detail: {packet, oldName, newName}});
};

type ImportPacketEventDetail = {
	location? : SeedPacketLocation
};

export type ImportPacketEvent = CustomEvent<ImportPacketEventDetail>;

export const makeImportPacketEvent = (location? : SeedPacketLocation) : ImportPacketEvent => {
	return new CustomEvent(IMPORT_PACKET_EVENT_NAME, {composed: true, detail: {location}});
};

type PropertyCollapsedEventDetail = {
	path : ObjectPath,
	collapsed: boolean
}

export type PropertyCollapsedEvent = CustomEvent<PropertyCollapsedEventDetail>;

export const makePropertyCollapsedEvent = (path : ObjectPath, collapsed : boolean) : PropertyCollapsedEvent => {
	return new CustomEvent(PROPERTY_COLLAPSED_EVENT_NAME, {composed: true, detail: {path, collapsed}});
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

type PropertyMovedEventDetail = {
	path : ObjectPath,
	newPath: ObjectPath
}

export type PropertyMovedEvent = CustomEvent<PropertyMovedEventDetail>;

export const makePropertyMovedEvent = (path : ObjectPath, newPath: ObjectPath) : PropertyMovedEvent => {
	return new CustomEvent(PROPERTY_MOVED_EVENT_NAME, {composed: true, detail: {path, newPath}});
};

export type ShowEditJSONEvent = CustomEvent<undefined>;

export const makeShowEditJSONEvent = () : ShowEditJSONEvent => {
	return new CustomEvent(SHOW_EDIT_JSON_EVENT_NAME, {composed: true});
};

type RunSeedEventDetail = SeedReference & {
	packetType: PacketType
};

export type RunSeedEvent = CustomEvent<RunSeedEventDetail>;

export const makeRunSeedEvent = (packet: PacketName, packetType: PacketType, seed: SeedID) : RunSeedEvent => {
	return new CustomEvent(RUN_SEED_EVENT_NAME, {composed: true, detail: {packet, packetType, seed}});
};

type EnvironmentDeletedEventDetail = {
	context: EnvironmentContext
	key : string,
}

export type EnvironmentDeletedEvent = CustomEvent<EnvironmentDeletedEventDetail>;

export const makeEnvironmentDeletedEvent = (context : EnvironmentContext, key : string) : EnvironmentDeletedEvent => {
	return new CustomEvent(ENVIRONMENT_DELETED_EVENT_NAME, {composed: true, detail: {context, key}});
};

type EnvironmentChangedEventDetail = EnvironmentDeletedEventDetail & {
	value: unknown
}

export type EnvironmentChangedEvent = CustomEvent<EnvironmentChangedEventDetail>;

export const makeEnvironmentChangedEvent = (context : EnvironmentContext, key : string, value: unknown) : EnvironmentChangedEvent => {
	return new CustomEvent(ENVIRONMENT_CHANGED_EVENT_NAME, {composed: true, detail: {context, key, value}});
};

type DialogShouldCloseEventDetail = {
	cancelled: boolean
};

export type DialogShouldCloseEvent = CustomEvent<DialogShouldCloseEventDetail>;

export const makeDialogShouldCloseEvent = (cancelled : boolean) : DialogShouldCloseEvent => {
	return new CustomEvent(DIALOG_SHOULD_CLOSE_EVENT_NAME, {composed: true, detail:{cancelled}});
};

type UndoEvent = CustomEvent<null>;

export const makeUndoEvent = () : UndoEvent => {
	return new CustomEvent(UNDO_EVENT_NAME, {composed: true});
};

export const makeRedoEvent = () : UndoEvent => {
	return new CustomEvent(REDO_EVENT_NAME, {composed: true});
};