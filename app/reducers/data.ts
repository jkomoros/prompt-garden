import {
	AnyAction
} from 'redux';

import {} from '../actions/data.js';

import {
	DataState,
} from '../types.js';

const INITIAL_STATE : DataState = {};

const data = (state : DataState = INITIAL_STATE, action : AnyAction) : DataState => {
	switch (action.type) {
	default:
		return state;
	}
};

export default data;
