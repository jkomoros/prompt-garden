import {
	AnyAction
} from 'redux';

export const CREATE_PACKET = 'CREATE_PACKET';

export const createPacket = (name : string) : AnyAction => {
	return {
		type: CREATE_PACKET,
		name
	};
};