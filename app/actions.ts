import {
	z
} from 'zod';

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

//TODO: create an action object for each action, strictly typed.

const actionUpdatePage = z.object({
	type: z.literal(UPDATE_PAGE),
	page: z.string(),
	pageExtra: z.string()
});

export type ActionUpdatePage = z.infer<typeof actionUpdatePage>;

const actionUpdateOffline = z.object({
	type: z.literal(UPDATE_OFFLINE),
	offline: z.boolean()
});

export type ActionUpdateOffline = z.infer<typeof actionUpdateOffline>;

//TODO: actions for data.ts
//TODO: actions for dialog.ts
//TODO: actions for garden.ts

const someAction = z.discriminatedUnion('type', [
	actionUpdatePage,
	actionUpdateOffline
]);

export type SomeAction = z.infer<typeof someAction>;

//TODO: remove all use of AnyAction anywhere. store.js depends on actions.ts depends on types.

//TODO: remove ThunkResult type