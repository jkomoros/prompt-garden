import {
	AbsoluteSeedReference,
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

export const seedReferenceToString = (ref : SeedReference) : string => {
	let result = ref.packet || '';
	result += '#';
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