export const START_SEED = 'START_SEED';
export const SEED_FINISHED = 'SEED_FINISHED';
export const SEED_ERRORED = 'SEED_ERRORED';

import {
	ThunkResult
} from '../store.js';

import {
	SeedReference
} from '../../src/types.js';

import {
	selectGarden
} from '../selectors.js';

export const runSeed = (ref : SeedReference) : ThunkResult => async (dispatch, getState) =>  {
	dispatch({
		type: START_SEED,
		ref
	});
	const state = getState();
	const garden = selectGarden(state);

	//TODO: catch thrown errors too
	const seed = await garden.seed(ref);
	if (!seed) {
		dispatch({
			type: SEED_ERRORED,
			error: `Couldn't find seed ${ref.seed} in packet ${ref.packet || '<empty>'}`
		});
		return;
	}
	const result = await seed.grow();
	dispatch({
		type: SEED_FINISHED,
		result
	});
};