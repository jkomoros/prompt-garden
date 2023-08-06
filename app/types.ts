import { SeedPacket } from '../src/types.js';

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type Packets = Record<string, SeedPacket>;

export type DataState = {
	packets: Packets
};

export type RootState = {
	app: AppState;
	data: DataState;
};