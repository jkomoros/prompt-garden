import {
	AnyAction
} from 'redux';

import {
	OPEN_DIALOG,
	CLOSE_DIALOG
} from '../actions.js';

import {
	DialogKind
} from '../types_store.js';

export const showError = (message : string) : AnyAction => {
	return openDialog('error', message);
};

export const showEditJSON = () : AnyAction => {
	return openDialog('edit-json');
};

const openDialog = (kind : DialogKind = '', message = '') : AnyAction => {
	return {
		type: OPEN_DIALOG,
		kind,
		message
	};
};

export const closeDialog = () : AnyAction => {
	return {
		type: CLOSE_DIALOG
	};
};