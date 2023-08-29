import {
	z
} from 'zod';

import {
	dialogKind
} from './types_store.js';

import {
	environmentData,
	seedID,
	seedPacket,
	seedPacketAbsoluteLocation,
	seedReference,
	value
} from '../src/types.js';

import {
	objectPath,
	packetName,
	packetType,
	packets
} from './types.js';

export const UPDATE_PAGE = 'UPDATE_PAGE';
export const UPDATE_OFFLINE = 'UPDATE_OFFLINE';
export const UPDATE_HASH = 'UPDATE_HASH';
export const LOAD_ENVIRONMENT = 'LOAD_ENVIRONMENT';
export const CHANGE_ENVIRONMENT_PROPERTY = 'CHANGE_ENVIRONMENT_PROPERTY';
export const DELETE_ENVIRONMENT_PROPERTY = 'DELETE_ENVIRONMENT_PROPERTY';
export const LOAD_PACKETS = 'LOAD_PACKETS';
export const CREATE_PACKET = 'CREATE_PACKET';
export const DELETE_PACKET = 'DELETE_PACKET';
export const REPLACE_PACKET = 'REPLACE_PACKET';
export const IMPORT_PACKET = 'IMPORT_PACKET';
export const CREATE_SEED = 'CREATE_SEED';
export const DELETE_SEED = 'DELETE_SEED';
export const SWITCH_TO_PACKET = 'SWITCH_TO_PACKET';
export const SWITCH_TO_SEED = 'SWITCH_TO_SEED';
export const CHANGE_PROPERTY = 'CHANGE_PROPERTY';
export const DELETE_PROPERTY = 'DELETE_PROPERTY';
export const OPEN_DIALOG = 'OPEN_DIALOG';
export const CLOSE_DIALOG = 'CLOSE_DIALOG';
export const START_SEED = 'START_SEED';
export const SEED_FINISHED = 'SEED_FINISHED';
export const SEED_ERRORED = 'SEED_ERRORED';

const actionType = z.enum([
	UPDATE_PAGE,
	UPDATE_OFFLINE,
	UPDATE_HASH,
	LOAD_ENVIRONMENT,
	CHANGE_ENVIRONMENT_PROPERTY,
	DELETE_ENVIRONMENT_PROPERTY,
	LOAD_PACKETS,
	CREATE_PACKET,
	DELETE_PACKET,
	REPLACE_PACKET,
	IMPORT_PACKET,
	CREATE_SEED,
	DELETE_SEED,
	SWITCH_TO_PACKET,
	SWITCH_TO_SEED,
	CHANGE_PROPERTY,
	DELETE_PROPERTY,
	OPEN_DIALOG,
	CLOSE_DIALOG,
	START_SEED,
	SEED_FINISHED,
	SEED_ERRORED
]);

export type ActionType = z.infer<typeof actionType>;

const actionUpdatePage = z.object({
	type: z.literal(UPDATE_PAGE),
	page: z.string(),
	pageExtra: z.string()
}).strict();

export type ActionUpdatePage = z.infer<typeof actionUpdatePage>;

const actionUpdateOffline = z.object({
	type: z.literal(UPDATE_OFFLINE),
	offline: z.boolean()
}).strict();

export type ActionUpdateOffline = z.infer<typeof actionUpdateOffline>;

const actionLoadEnvironment = z.object({
	type: z.literal(LOAD_ENVIRONMENT),
	environment: environmentData
}).strict();

export type ActionLoadEnvironment = z.infer<typeof actionLoadEnvironment>;

const actionChangeEnvironmentProperty = z.object({
	type: z.literal(CHANGE_ENVIRONMENT_PROPERTY),
	key: z.string(),
	value: z.unknown()
}).strict();

export type ActionChangeEnvironmentProperty = z.infer<typeof actionChangeEnvironmentProperty>;

const actionDeleteEnvironmentProperty = z.object({
	type: z.literal(DELETE_ENVIRONMENT_PROPERTY),
	key: z.string()
}).strict();

const actionLoadPackets = z.object({
	type: z.literal(LOAD_PACKETS),
	packets: packets,
	packetType: packetType
}).strict();

export type ActionLoadPackets = z.infer<typeof actionLoadPackets>;

const actionCreatePacket = z.object({
	type: z.literal(CREATE_PACKET),
	packet: packetName
}).strict();

const actionDeletePacket = z.object({
	type: z.literal(DELETE_PACKET),
	packet: packetName,
	packetType: packetType
}).strict();

const actionReplacePacket = z.object({
	type: z.literal(REPLACE_PACKET),
	packet: packetName,
	packetType: packetType,
	data: seedPacket
}).strict();

const actionImportPacket = z.object({
	type: z.literal(IMPORT_PACKET),
	location: seedPacketAbsoluteLocation,
	data: seedPacket
}).strict();

const actionCreateSeed = z.object({
	type: z.literal(CREATE_SEED),
	packet: packetName,
	seed: seedID
}).strict();

const actionDeleteSeed = z.object({
	type: z.literal(DELETE_SEED),
	packet: packetName,
	packetType: packetType,
	seed: seedID
}).strict();

const actionSwitchToPacket = z.object({
	type: z.literal(SWITCH_TO_PACKET),
	packet: packetName,
	packetType: packetType
}).strict();

const actionSwitchToSeed = z.object({
	type: z.literal(SWITCH_TO_SEED),
	packet: packetName,
	packetType: packetType,
	seed: seedID
}).strict();

const actionChangeProperty = z.object({
	type: z.literal(CHANGE_PROPERTY),
	path: objectPath,
	value: z.unknown()
}).strict();

const actionDeleteProperty = z.object({
	type: z.literal(DELETE_PROPERTY),
	path: objectPath
}).strict();

const actionOpenDialog = z.object({
	type: z.literal(OPEN_DIALOG),
	kind: dialogKind,
	message: z.string()
}).strict();

export type ActionOpenDialog = z.infer<typeof actionOpenDialog>;

const actionCloseDialog = z.object({
	type: z.literal(CLOSE_DIALOG)
}).strict();

export type ActionCloseDialog = z.infer<typeof actionCloseDialog>;

const actionStartSeed = z.object({
	type: z.literal(START_SEED),
	ref: seedReference
}).strict();

const actionSeedFinished = z.object({
	type: z.literal(SEED_FINISHED),
	result: value
}).strict();

const actionSeedErrored = z.object({
	type: z.literal(SEED_ERRORED),
	error: z.string()
}).strict();

const someAction = z.discriminatedUnion('type', [
	actionUpdatePage,
	actionUpdateOffline,
	actionLoadEnvironment,
	actionChangeEnvironmentProperty,
	actionDeleteEnvironmentProperty,
	actionLoadPackets,
	actionCreatePacket,
	actionDeletePacket,
	actionReplacePacket,
	actionImportPacket,
	actionCreateSeed,
	actionDeleteSeed,
	actionSwitchToPacket,
	actionSwitchToSeed,
	actionChangeProperty,
	actionDeleteProperty,
	actionOpenDialog,
	actionCloseDialog,
	actionStartSeed,
	actionSeedFinished,
	actionSeedErrored
]);

export type SomeAction = z.infer<typeof someAction>;

//TODO: remove all use of AnyAction anywhere. store.js depends on actions.ts depends on types.

//TODO: remove ThunkResult type