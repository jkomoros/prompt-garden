import {
	AbsoluteSeedReference,
	RelativeSeedReference,
	SeedPacketAbsoluteLocation,
	SeedReference,
	absoluteSeedReference,
	relativeSeedReference
} from './types.js';

export const isRelativeSeedReference = (a : unknown) : a is RelativeSeedReference => {
	return relativeSeedReference.safeParse(a).success;
};

export const isAbsoluteSeedReference = (a : unknown) : a is AbsoluteSeedReference => {
	return absoluteSeedReference.safeParse(a).success;
};

export const makeAbsolute = (ref : SeedReference, base : SeedPacketAbsoluteLocation) : AbsoluteSeedReference => {
	if (isAbsoluteSeedReference(ref)) return ref;
	if (ref.rel == undefined) {
		return {
			location: base,
			id: ref.id
		};
	}
	const url = new URL(ref.rel, 'file://localhost/' + base);
	//TODO: this slices off the '/' assuming the base is a relative path from the current working directory.
	const location = url.pathname.slice(1);
	return {
		location,
		id: ref.id
	};
};