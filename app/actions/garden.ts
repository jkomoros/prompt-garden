import {
	ThunkSomeAction
} from '../store.js';

import {
	START_SEED,
	SEED_ERRORED,
	SEED_FINISHED,
	ActionSeedErrored,
	ActionSeedFinished
} from '../actions.js';

import {
	SeedReference,
	Value
} from '../../src/types.js';

import {
	selectCurrentSeedSelector,
	selectGarden
} from '../selectors.js';

import {
	PacketType
} from '../types.js';

export const runCurrentSeed = () : ThunkSomeAction => (dispatch, getState) => {
	const state = getState();
	const selector = selectCurrentSeedSelector(state);
	const ref : SeedReference = {
		seed: selector.seedID,
		packet: selector.packetName
	};
	dispatch(runSeed(ref, selector.packetType));
};

export const runSeed = (ref : SeedReference, _packetType : PacketType) : ThunkSomeAction => async (dispatch, getState) =>  {

	//TODO: can we just get rid of packetType and not wire it through? as long
	//as the name is globally unique in packets it's fine...
	dispatch({
		type: START_SEED,
		ref
	});
	const state = getState();
	const garden = selectGarden(state);

	if (!garden) {
		dispatch(seedErrored('Garden was invalid'));
		return;
	}

	//TODO: catch thrown errors too
	const seed = await garden.seed(ref);
	if (!seed) {
		const message = `Couldn't find seed ${ref.seed} in packet ${ref.packet || '<empty>'}`;
		dispatch(seedErrored(message));
	}
	try {
		const result = await seed.grow();
		dispatch(seedFinished(result));
	} catch(err) {
		dispatch(seedErrored(String(err)));
	}
};

const seedFinished = (result : Value) : ActionSeedFinished =>{
	//TODO: figure out a different way of showing.
	alert(`Result: ${result}`);
	return {
		type: SEED_FINISHED,
		result
	};
};

const seedErrored = (message : string) : ActionSeedErrored =>{
	//TODO: show in an official dialog
	alert(`Error: ${message}`);
	return {
		type: SEED_ERRORED,
		error: message
	};
};