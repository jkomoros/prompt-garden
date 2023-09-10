import {
	z
} from 'zod';

import {
	CurrentSeedSelector,
	Packets
} from './types.js';

import {
	EnvironmentData,
	SeedReference
} from '../src/types.js';

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type DataState = CurrentSeedSelector & {
	packets: Packets,
	remotePackets: Packets,
	environment: EnvironmentData
};

export const dialogKind = z.enum([
	'',
	'error',
	'edit-json'
]);

export type DialogKind = z.infer<typeof dialogKind>;

export type DialogState = {
	open : boolean
	kind : DialogKind,
	message : string
}

export type RunStatus = 'idle' | 'running';

export type GardenState = {
	status: RunStatus,
	ref: SeedReference | null,
	success: boolean,
	result: unknown,
	error: string
}

export type RootState = {
	app: AppState;
	data: DataState;
	dialog? : DialogState,
	garden? : GardenState
};