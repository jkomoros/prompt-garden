import {
	ThunkResult
} from '../store.js';

import {
	START_SEED,
	SEED_ERRORED,
	SEED_FINISHED
} from '../actions.js';

import {
	SeedReference
} from '../../src/types.js';

import {
	selectGarden
} from '../selectors.js';

import {
	PacketType
} from '../types.js';

export const runSeed = (ref : SeedReference, _packetType : PacketType) : ThunkResult => async (dispatch, getState) =>  {

	//TODO: can we just get rid of packetType and not wire it through? as long
	//as the name is globally unique in packets it's fine...
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