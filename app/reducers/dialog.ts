import {
	OPEN_DIALOG,
	CLOSE_DIALOG,
	SomeAction
} from '../actions.js';

import {
	DialogState
} from '../types_store.js';

const INITIAL_STATE : DialogState = {
	open: false,
	kind: '',
	message: '',
	title: '',
	choices: undefined,
	defaultValue: ''
};

const app = (state : DialogState = INITIAL_STATE, action : SomeAction) : DialogState => {
	switch (action.type) {
	case OPEN_DIALOG:
		return {
			...state,
			open: true,
			kind: action.kind,
			message: action.message,
			title: action.title,
			defaultValue: action.defaultValue,
			choices: action.choices
		};
	case CLOSE_DIALOG:
		return {
			...state,
			open: false,
			kind: '',
			message: '',
			title: '',
			defaultValue: '',
			choices: undefined
		};
	default:
		return state;
	}
};

export default app;
