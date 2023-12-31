import {
	z
} from 'zod';

import {
	PacketName,
	PacketType,
	Packets
} from './types.js';

import {
	Choice,
	EnvironmentData,
	SeedID,
	SeedReference
} from '../src/types.js';

import {
	CalculationEvent
} from '../src/calculation.js';

import {
	UndoableState
} from './undoable.js';

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type VersionedDataState = {
	packets: Packets,
	environment: EnvironmentData
};

export type DataState = {
	currentPacket: PacketName,
	currentPacketType: PacketType,
	currentSeed: SeedID,
	versioned: UndoableState<VersionedDataState>,
	remotePackets: Packets
};

export const dialogKind = z.enum([
	'',
	'error',
	'info',
	'confirm',
	'edit-json',
	'prompt'
]);

export type DialogKind = z.infer<typeof dialogKind>;

export type DialogState = {
	open : boolean
	kind : DialogKind,
	message : string,
	title: string,
	defaultValue: string,
	choices? : Choice[]
}

export type RunStatus = 'idle' | 'running' | 'finished';

export type GardenState = {
	status: RunStatus,
	ref: SeedReference | null,
	success: boolean,
	result: unknown,
	error: string,
	events: CalculationEvent[]
}

export type RootState = {
	app: AppState;
	data: DataState;
	dialog? : DialogState,
	garden? : GardenState
};