export const START_SEED = 'START_SEED';
export const SEED_FINISHED = 'SEED_FINISHED';
export const SEED_ERRORED = 'SEED_ERRORED';

import {
	ThunkResult
} from '../store.js';

import {
	SeedID
} from '../../src/types.js';

import {
	PacketName
} from '../types.js';

export const runSeed = (packetName : PacketName, seedID : SeedID) : ThunkResult => (dispatch) =>  {
	dispatch({
		type: START_SEED,
		packetName,
		seedID
	});
	throw new Error('Actually running a seed is not yet supported');
};