
//Types in esm-seedrandom.d.ts
import {
	prng_alea
} from 'esm-seedrandom';

import {
	RandomGenerator
} from './types.js';

export const makeSeededRandom = (seed : string) : RandomGenerator => {
	const rnd = prng_alea(seed);
	return () => rnd.quick();
};