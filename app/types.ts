import { SeedPacket } from '../src/types.js';

export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type DataState = {
	packets: Record<string, SeedPacket>
};

export type RootState = {
	app: AppState;
	data: DataState;
};