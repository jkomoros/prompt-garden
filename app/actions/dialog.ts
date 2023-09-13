import {
	OPEN_DIALOG,
	CLOSE_DIALOG,
	ActionCloseDialog,
	ActionOpenDialog
} from '../actions.js';

import {
	DialogKind
} from '../types_store.js';

export const showError = (message : string) : ActionOpenDialog => {
	return openDialog('error', message);
};

export const showEditJSON = () : ActionOpenDialog => {
	return openDialog('edit-json');
};

export const showPrompt = (message: string, defaultValue : string, choices? : string[]) : ActionOpenDialog => {
	return openDialog('prompt', message, defaultValue, choices);
};

const openDialog = (kind : DialogKind = '', message = '', defaultValue = '', choices? : string[]) : ActionOpenDialog => {
	return {
		type: OPEN_DIALOG,
		kind,
		message,
		defaultValue,
		choices
	};
};

export const closeDialog = () : ActionCloseDialog => {
	return {
		type: CLOSE_DIALOG
	};
};