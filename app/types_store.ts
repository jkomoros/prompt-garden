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

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type DataState = {
	currentPacket : PacketName,
	currentPacketType : PacketType,
	currentSeed : SeedID,
	packets: Packets,
	remotePackets: Packets,
	environment: EnvironmentData
};

export type DialogKind = '' | 'error' | 'edit-json';

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