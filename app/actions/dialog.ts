import {
	OPEN_DIALOG,
	CLOSE_DIALOG,
	ActionCloseDialog,
} from '../actions.js';

import {
	selectDialogOpen
} from '../selectors.js';

import {
	ThunkSomeAction
} from '../store.js';

import {
	DialogKind
} from '../types_store.js';

export const showError = (message : string) : ThunkSomeAction => (dispatch) => {
	dispatch(openDialog('error', message));
};

export const showInfo = (message : string) : ThunkSomeAction => (dispatch) => {
	dispatch(openDialog('info', message));
};

export const showEditJSON = () : ThunkSomeAction => (dispatch) =>  {
	dispatch(openDialog('edit-json'));
};

export const showPrompt = (message: string, defaultValue : string, choices? : string[]) : ThunkSomeAction => (dispatch) => {
	dispatch(openDialog('prompt', message, defaultValue, choices));
};

const openDialog = (kind : DialogKind = '', message = '', defaultValue = '', choices? : string[]) : ThunkSomeAction => (dispatch, getState) => {

	const state = getState();
	const open = selectDialogOpen(state);
	if (open) throw new Error('Dialog already open');

	dispatch({
		type: OPEN_DIALOG,
		kind,
		message,
		defaultValue,
		choices
	});
};

export const closeDialog = () : ActionCloseDialog => {
	return {
		type: CLOSE_DIALOG
	};
};