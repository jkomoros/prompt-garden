import {
	AbsoluteSeedReference,
	PackedSeedReference,
	SeedPacketAbsoluteLocation,
	SeedPacketLocation,
	SeedPacketRelativeLocation,
	SeedReference,
	seedPacketRelativeLocation
} from './types.js';

export const isLocalLocation = (location : SeedPacketAbsoluteLocation) : boolean => {
	if (location.startsWith('http://') || location.startsWith('https://')) return false;
	return true;
};

export const packSeedReference = (ref : SeedReference) : PackedSeedReference => {
	let result = ref.packet || '';
	if (result) result += '#';
	result += ref.id;
	return result;
};

export const isRelativeSeedPacketLocation = (location : SeedPacketLocation) : location is SeedPacketRelativeLocation => {
	return seedPacketRelativeLocation.safeParse(location).success;
};

export const makeAbsolute = (ref : SeedReference, base : SeedPacketAbsoluteLocation) : AbsoluteSeedReference => {
	const location = ref.packet || '';
	if (!isRelativeSeedPacketLocation(location)) {
		return {
			packet: location || base,
			id: ref.id
		};
	}
	if (isLocalLocation(base)) {
		const url = new URL(location, 'file://localhost/' + base);
		return {
			//TODO: this slices off the '/' assuming the base is a relative path from the current working directory.
			packet: url.pathname.slice(1),
			id: ref.id
		};
	}
	const url = new URL(location, base);
	return {
		packet: url.toString(),
		id: ref.id
	};
};