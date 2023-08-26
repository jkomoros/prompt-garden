import {
	AbsoluteSeedReference,
	PackedSeedReference,
	SeedPacketAbsoluteLocation,
	SeedPacketLocation,
	SeedPacketRelativeLocation,
	SeedReference,
	URLDomain,
	packedSeedReference,
	seedPacketRelativeLocation
} from './types.js';

export const PACKED_SEED_REFERENCE_DELIMITER = '#';

export const locationDomain = (location : SeedPacketAbsoluteLocation) : URLDomain => {
	if (isLocalLocation(location)) return 'localhost';
	const url = new URL(location);
	return url.hostname;
};

export const isLocalLocation = (location : SeedPacketAbsoluteLocation) : boolean => {
	if (location.startsWith('http://') || location.startsWith('https://')) return false;
	return true;
};

export const packSeedReference = (ref : SeedReference) : PackedSeedReference => {
	let result = ref.packet || '';
	if (result) result += PACKED_SEED_REFERENCE_DELIMITER;
	result += ref.seed;
	return result;
};

export const unpackSeedReference = (ref : PackedSeedReference, base : SeedPacketAbsoluteLocation = '') : AbsoluteSeedReference => {
	//Verify it matches
	packedSeedReference.parse(ref);

	const parts = ref.split(PACKED_SEED_REFERENCE_DELIMITER);
	if (parts.length == 1) {
		return {
			packet: base,
			seed: parts[0]
		};
	}
	return {
		packet: parts[0],
		seed: parts[1]
	};
};

export const isRelativeSeedPacketLocation = (location : SeedPacketLocation) : location is SeedPacketRelativeLocation => {
	return seedPacketRelativeLocation.safeParse(location).success;
};

export const makeSeedReferenceAbsolute = (ref : SeedReference, base : SeedPacketAbsoluteLocation) : AbsoluteSeedReference => {
	const location = ref.packet || '';
	if (!isRelativeSeedPacketLocation(location)) {
		return {
			packet: location || base,
			seed: ref.seed
		};
	}
	if (isLocalLocation(base)) {
		const url = new URL(location, 'file://localhost/' + base);
		return {
			//TODO: this slices off the '/' assuming the base is a relative path from the current working directory.
			packet: url.pathname.slice(1),
			seed: ref.seed
		};
	}
	const url = new URL(location, base);
	return {
		packet: url.toString(),
		seed: ref.seed
	};
};