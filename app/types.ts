import {
	SeedPacket
} from '../src/types.js';

import {
	absoluteRegExp
} from '../src/util.js';

import {
	z
} from 'zod';

export type PacketName = string;

export type Packets = Record<PacketName, SeedPacket>;

const objectPathPartRegExp = new RegExp('[a-zA-Z0-9_-]*');

const objectPathPartString = z.string().regex(absoluteRegExp(objectPathPartRegExp));

const objectPathPartInt = z.number().int().positive();

const objectPathPart = z.union([
	objectPathPartString,
	objectPathPartInt
]);

type ObjectPathPart = z.infer<typeof objectPathPart>;

//Selects a path into an object to modify.
export type ObjectPath = ObjectPathPart[];

const dottedObjectPathRegExp = new RegExp('(' + objectPathPartRegExp.source + '.)*' + objectPathPartRegExp.source);

const dottedObjectPath = z.string().regex(absoluteRegExp(dottedObjectPathRegExp));

//Like ObjectPath but with each part with a dot.
export type DottedObjectPath = z.infer<typeof dottedObjectPath>;

export type DetailedChoice =  {
	//The actual value of the choice
	value: string,
	//The description to show on the choice, defaulting to display (and then to value) if not provided
	description?: string,
	//The value to show to the user, defaulting to 'value' if not provided
	display? : string
};

//If just a string is provided, it's equivalent to {value: STRING}
export type Choice = string | DetailedChoice;

export const packetType = z.union([
	z.literal('local'),
	z.literal('remote')
]);

export type PacketType = z.infer<typeof packetType>;

export type PacketsBundle = {
	[t in PacketType]: Packets
};

export const EMPTY_PACKETS_BUNDLE : PacketsBundle = {
	local: {},
	remote: {}
};