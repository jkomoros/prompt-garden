export const OPEN_DIALOG = 'OPEN_DIALOG';
export const CLOSE_DIALOG = 'CLOSE_DIALOG';

import {
	AnyAction
} from 'redux';

import {
	DialogKind
} from '../types.js';

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