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

export const runSeed = (ref : SeedReference, remote : boolean) : ThunkResult => async (dispatch, getState) =>  {
	if (remote) throw new Error('remote not yet supported');
	dispatch({
		type: START_SEED,
		ref
	});
	const state = getState();
	const garden = selectGarden(state);

	//TODO: catch thrown errors too
	const seed = await garden.seed(ref);
	if (!seed) {
		const message = `Couldn't find seed ${ref.seed} in packet ${ref.packet || '<empty>'}`;
		dispatch({
			type: SEED_ERRORED,
			error: message
		});
		//TODO: show in an official dialog
		alert(`Error: ${message}`);
		return;
	}
	const result = await seed.grow();
	dispatch({
		type: SEED_FINISHED,
		result
	});
	//TODO: figure out a different way of showing.
	alert(`Result: ${result}`);
};