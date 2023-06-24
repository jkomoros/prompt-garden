import {
	AbsoluteSeedReference,
	RelativeSeedReference,
	SeedPacketAbsoluteLocation,
	SeedReference,
	absoluteSeedReference,
	relativeSeedReference
} from './types.js';

//TODO: change name to isLocalLocation.
export const isFileLocation = (location : SeedPacketAbsoluteLocation) : boolean => {
	if (location.startsWith('http://') || location.startsWith('https://')) return false;
	return true;
};

export const isRelativeSeedReference = (a : unknown) : a is RelativeSeedReference => {
	return relativeSeedReference.safeParse(a).success;
};

export const isAbsoluteSeedReference = (a : unknown) : a is AbsoluteSeedReference => {
	return absoluteSeedReference.safeParse(a).success;
};

export const seedReferenceToString = (ref : SeedReference) : string => {
	let result = isAbsoluteSeedReference(ref) ? ref.location : (ref.rel || '');
	result += '#';
	result += ref.id;
	return result;
};

export const makeAbsolute = (ref : SeedReference, base : SeedPacketAbsoluteLocation) : AbsoluteSeedReference => {
	if (isAbsoluteSeedReference(ref)) return ref;
	if (ref.rel == undefined) {
		return {
			location: base,
			id: ref.id
		};
	}
	if (isFileLocation(base)) {
		const url = new URL(ref.rel, 'file://localhost/' + base);
		//TODO: this slices off the '/' assuming the base is a relative path from the current working directory.
		const location = url.pathname.slice(1);
		return {
			location,
			id: ref.id
		};
	}
	const url = new URL(ref.rel, base);
	return {
		location: url.toString(),
		id: ref.id
	};
};