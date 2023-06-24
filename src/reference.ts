import {
	LocalSeedID,
	SeedPacketLocation,
	SeedReference,
	SeedReferenceID,
	UnpackedSeedReferenceID,
	seedReference
} from './types.js';

const SEED_ID_DELIMITER = '#';

export const isSeedReference = (a : unknown) : a is SeedReference => {
	return seedReference.safeParse(a).success;
};

export const packSeedReferenceID = (location: SeedPacketLocation, id : LocalSeedID) : SeedReferenceID => {
	return location + SEED_ID_DELIMITER + id;
};

export const unpackSeedReferenceID = (ref : SeedReferenceID, defaultLocation : SeedPacketLocation = '.') : UnpackedSeedReferenceID => {
	const pieces = ref.split(SEED_ID_DELIMITER);
	if (pieces.length == 1) {
		return {
			location: defaultLocation,
			id: pieces[0]
		};
	}
	return {
		//the location might be ''
		location: pieces[0] || defaultLocation,
		id: pieces[1]
	};
};