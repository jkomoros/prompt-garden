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

import {
	selectGarden
} from '../selectors.js';

export const runSeed = (packetName : PacketName, seedID : SeedID) : ThunkResult => async (dispatch, getState) =>  {
	dispatch({
		type: START_SEED,
		packetName,
		seedID
	});
	const state = getState();
	const garden = selectGarden(state);

	//TODO: catch thrown errors too
	const seed = await garden.seed({seed: seedID, packet: packetName});
	if (!seed) {
		dispatch({
			type: SEED_ERRORED,
			error: `Couldn't find seed ${seedID} in packet ${packetName}`
		});
		return;
	}
	const result = await seed.grow();
	dispatch({
		type: SEED_FINISHED,
		result
	});
};