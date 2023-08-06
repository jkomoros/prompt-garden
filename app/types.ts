import { SeedPacket } from '../src/types.js';

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type PacketName = string;

export type Packets = Record<PacketName, SeedPacket>;

export type DataState = {
	currentPacket : PacketName,
	packets: Packets
};

export type RootState = {
	app: AppState;
	data: DataState;
};