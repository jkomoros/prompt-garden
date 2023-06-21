import {
	SeedPacketLocation,
	SeedReferenceID,
	UnpackedSeedReferenceID
} from './types.js';

const SEED_ID_DELIMITER = '#';

export const unpackSeedReferenceID = (ref : SeedReferenceID, defaultLocation : SeedPacketLocation) : UnpackedSeedReferenceID => {
	const pieces = ref.split(SEED_ID_DELIMITER);
	if (pieces.length == 1) {
		return {
			location: defaultLocation,
			id: pieces[0]
		};
	}
	return {
		location: pieces[0],
		id: pieces[1]
	};
};