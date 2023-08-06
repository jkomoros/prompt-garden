
export type AppState = {
	page : string;
	pageExtra : string;
	offline : boolean;
	hash: string;
};

export type DataState = Record<string, never>;

export type RootState = {
	app: AppState;
	data: DataState;
};