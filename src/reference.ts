import {
	AbsoluteSeedReference,
	PackedSeedReference,
	SeedPacketAbsoluteLocation,
	SeedPacketLocation,
	SeedPacketRelativeLocation,
	SeedReference,
	URLDomain,
	packedSeedReference,
	seedPacketLocation,
	seedPacketRelativeLocation
} from './types.js';

export const PACKED_SEED_REFERENCE_DELIMITER = '#';

export const seedRefEquivalent = (a? : SeedReference, b? : SeedReference) : boolean => {
	if (a == b) return true;
	if (!a || !b) return false;
	return packSeedReference(a) == packSeedReference(b);
};

export const locationDomain = (location : SeedPacketAbsoluteLocation) : URLDomain => {
	if (isLocalLocation(location)) return 'localhost';
	const url = new URL(location);
	return url.hostname;
};

export const isLocation = (location : SeedPacketLocation) : boolean => {
	return seedPacketLocation.safeParse(location).success;
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

export const makeLocationAbsolute = (location : SeedPacketLocation, base : SeedPacketAbsoluteLocation) : SeedPacketAbsoluteLocation => {
	if (!isRelativeSeedPacketLocation(location)) {
		return location || base;
	}
	if (isLocalLocation(base)) {
		const url = new URL(location, 'file://localhost/' + base);
		//TODO: this slices off the '/' assuming the base is a relative path from the current working directory.
		return url.pathname.slice(1);
	}
	const url = new URL(location, base);
	return url.toString();
};

export const makeSeedReferenceAbsolute = (ref : SeedReference, base : SeedPacketAbsoluteLocation) : AbsoluteSeedReference => {
	const location = ref.packet || '';
	return {
		packet: makeLocationAbsolute(location, base),
		seed: ref.seed
	};
};