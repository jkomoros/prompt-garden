import {
	z
} from 'zod';

import {
	dialogKind
} from './types_store.js';

import {
	environmentData,
	seedID,
	seedPacketIsh,
	seedPacketAbsoluteLocation,
	seedReference,
	value,
	choice
} from '../src/types.js';

import {
	environmentContext,
	objectPath,
	packetName,
	packetType,
	packets
} from './types.js';

import {
	calculationEvent
} from '../src/calculation.js';

export const UPDATE_PAGE = 'UPDATE_PAGE';
export const UPDATE_OFFLINE = 'UPDATE_OFFLINE';
export const UPDATE_HASH = 'UPDATE_HASH';
export const LOAD_ENVIRONMENT = 'LOAD_ENVIRONMENT';
export const CHANGE_ENVIRONMENT_PROPERTY = 'CHANGE_ENVIRONMENT_PROPERTY';
export const DELETE_ENVIRONMENT_PROPERTY = 'DELETE_ENVIRONMENT_PROPERTY';
export const LOAD_PACKETS = 'LOAD_PACKETS';
export const CREATE_PACKET = 'CREATE_PACKET';
export const DELETE_PACKET = 'DELETE_PACKET';
export const FORK_PACKET = 'FORK_PACKET';
export const REPLACE_PACKET = 'REPLACE_PACKET';
export const IMPORT_PACKET = 'IMPORT_PACKET';
export const CREATE_SEED = 'CREATE_SEED';
export const DELETE_SEED = 'DELETE_SEED';
export const RENAME_SEED = 'RENAME_SEED';
export const SET_PACKET_COLLAPSED = 'SET_PACKET_COLLAPSED';
export const SWITCH_TO_PACKET = 'SWITCH_TO_PACKET';
export const SWITCH_TO_SEED = 'SWITCH_TO_SEED';
export const COLLAPSE_PROPERTY = 'COLLAPSE_PROPERTY';
export const CHANGE_PROPERTY = 'CHANGE_PROPERTY';
export const DELETE_PROPERTY = 'DELETE_PROPERTY';
export const OPEN_DIALOG = 'OPEN_DIALOG';
export const CLOSE_DIALOG = 'CLOSE_DIALOG';
export const START_SEED = 'START_SEED';
export const SEED_EVENT = 'SEED_EVENT';
export const SEED_FINISHED = 'SEED_FINISHED';
export const SEED_ERRORED = 'SEED_ERRORED';
export const CLOSE_RUN_DIALOG = 'CLOSE_RUN_DIALOG';
export const UNDO = 'UNDO';
export const REDO = 'REDO';

const actionUpdatePage = z.object({
	type: z.literal(UPDATE_PAGE),
	page: z.string(),
	pageExtra: z.string()
}).strict();

const actionUpdateOffline = z.object({
	type: z.literal(UPDATE_OFFLINE),
	offline: z.boolean()
}).strict();

export type ActionUpdateOffline = z.infer<typeof actionUpdateOffline>;

const actionUpdateHash = z.object({
	type: z.literal(UPDATE_HASH),
	hash: z.string()
}).strict();

const actionLoadEnvironment = z.object({
	type: z.literal(LOAD_ENVIRONMENT),
	environment: environmentData
}).strict();

export type ActionLoadEnvironment = z.infer<typeof actionLoadEnvironment>;

const actionChangeEnvironmentProperty = z.object({
	type: z.literal(CHANGE_ENVIRONMENT_PROPERTY),
	context: environmentContext,
	key: z.string(),
	value: value,
	displayValue: z.string()
}).strict();

const actionDeleteEnvironmentProperty = z.object({
	type: z.literal(DELETE_ENVIRONMENT_PROPERTY),
	context: environmentContext,
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


const actionForkPacket = z.object({
	type: z.literal(FORK_PACKET),
	packet: packetName,
	packetType: packetType,
	newPacket: packetName
}).strict();

const actionReplacePacket = z.object({
	type: z.literal(REPLACE_PACKET),
	packet: packetName,
	packetType: packetType,
	data: seedPacketIsh
}).strict();

const actionImportPacket = z.object({
	type: z.literal(IMPORT_PACKET),
	location: seedPacketAbsoluteLocation,
	data: seedPacketIsh,
	collapsed: z.boolean()
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

const actionRenameSeed = z.object({
	type: z.literal(RENAME_SEED),
	packet: packetName,
	oldName: seedID,
	newName: seedID
}).strict();

const actionSetPacketCollapsed = z.object({
	type: z.literal(SET_PACKET_COLLAPSED),
	packet: packetName,
	packetType: packetType,
	collapsed: z.boolean()
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

const actionCollapseProperty = z.object({
	type: z.literal(COLLAPSE_PROPERTY),
	path: objectPath,
	collapsed: z.boolean(),
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
	message: z.string(),
	title: z.string(),
	defaultValue: z.string(),
	choices: z.array(choice).optional()
}).strict();

const actionCloseDialog = z.object({
	type: z.literal(CLOSE_DIALOG)
}).strict();

export type ActionCloseDialog = z.infer<typeof actionCloseDialog>;

const actionStartSeed = z.object({
	type: z.literal(START_SEED),
	ref: seedReference
}).strict();

const actionSeedEvent = z.object({
	type: z.literal(SEED_EVENT),
	event: calculationEvent
});

const actionSeedFinished = z.object({
	type: z.literal(SEED_FINISHED),
	result: value
}).strict();

const actionSeedErrored = z.object({
	type: z.literal(SEED_ERRORED),
	error: z.string()
}).strict();

const actionCloseRunDialog = z.object({
	type: z.literal(CLOSE_RUN_DIALOG)
});

const actionUndo = z.object({
	type: z.literal(UNDO)
});

const actionRedo = z.object({
	type: z.literal(REDO)
});

const someAction = z.discriminatedUnion('type', [
	actionUpdatePage,
	actionUpdateOffline,
	actionUpdateHash,
	actionLoadEnvironment,
	actionChangeEnvironmentProperty,
	actionDeleteEnvironmentProperty,
	actionLoadPackets,
	actionCreatePacket,
	actionDeletePacket,
	actionReplacePacket,
	actionForkPacket,
	actionImportPacket,
	actionCreateSeed,
	actionDeleteSeed,
	actionRenameSeed,
	actionSetPacketCollapsed,
	actionSwitchToPacket,
	actionSwitchToSeed,
	actionCollapseProperty,
	actionChangeProperty,
	actionDeleteProperty,
	actionOpenDialog,
	actionCloseDialog,
	actionStartSeed,
	actionSeedEvent,
	actionSeedFinished,
	actionSeedErrored,
	actionCloseRunDialog,
	actionUndo,
	actionRedo
]);

export type SomeAction = z.infer<typeof someAction>;