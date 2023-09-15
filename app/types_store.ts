import {
	z
} from 'zod';

import {
	PacketName,
	PacketType,
	Packets
} from './types.js';

import {
	EnvironmentData,
	SeedID,
	SeedReference
} from '../src/types.js';
import { CalculationEvent } from '../src/calculation.js';

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type DataState = {
	currentPacket: PacketName,
	currentPacketType: PacketType,
	currentSeed: SeedID,
	packets: Packets,
	remotePackets: Packets,
	environment: EnvironmentData
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
	choices? : string[]
}

export type RunStatus = 'idle' | 'running';

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