import {
	InputOptions,
	LeafValue,
	SeedID,
	genericExtraID,
	seedID,
	seedPacketAbsoluteRemoteLocation,
	seedPacketIsh
} from '../src/types.js';

import {
	absoluteRegExp
} from '../src/util.js';

import {
	z
} from 'zod';

export const packetName = genericExtraID.endsWith('.json');

export type PacketName = z.infer<typeof packetName>;

const stringTimestamp = z.string().datetime();

export type StringTimestamp = z.infer<typeof stringTimestamp>;

const baseCollapsedSeedMap = z.object({
	//NOTE: reducers/data.ts:collapseSeedProperty needs to change if this property name changes
	collapsed: z.boolean()
});

export type CollapsedSeedMap = z.infer<typeof baseCollapsedSeedMap> & {
	seeds: Record<SeedID, CollapsedSeedMap>
};

const collapsedSeedMap : z.ZodType<CollapsedSeedMap> = baseCollapsedSeedMap.extend({
	seeds: z.record(seedID, z.lazy(() => collapsedSeedMap))
});

export const wrappedPacket = z.object({
	displayName: z.optional(z.string()),
	lastUpdated: stringTimestamp,
	collapsed: collapsedSeedMap,
	data: seedPacketIsh
});

export type WrappedPacket = z.infer<typeof wrappedPacket>;

const permissivePacketName = z.union([
	seedPacketAbsoluteRemoteLocation.endsWith('.json'),
	packetName
]);

//We don't use packetName, because a key of ones that include / are OK for e.g. remote ones.
export const packets = z.record(permissivePacketName, wrappedPacket);

export type Packets = z.infer<typeof packets>;

export const environmentContext = z.enum(['global', 'packet']);

export type EnvironmentContext = z.infer<typeof environmentContext>;

const objectPathPartRegExp = new RegExp('[a-zA-Z0-9_-]*');

const objectPathPartString = z.string().regex(absoluteRegExp(objectPathPartRegExp));

const objectPathPartInt = z.number().int().positive();

const objectPathPart = z.union([
	objectPathPartString,
	objectPathPartInt
]);

export const objectPath = z.array(objectPathPart);

//Selects a path into an object to modify.
export type ObjectPath = z.infer<typeof objectPath>;

const dottedObjectPathRegExp = new RegExp('(' + objectPathPartRegExp.source + '.)*' + objectPathPartRegExp.source);

const dottedObjectPath = z.string().regex(absoluteRegExp(dottedObjectPathRegExp));

//Like ObjectPath but with each part with a dot.
export type DottedObjectPath = z.infer<typeof dottedObjectPath>;

export const packetType = z.enum(['local', 'remote']);

export type PacketType = z.infer<typeof packetType>;

export type PacketsBundle = {
	[t in PacketType]: Packets
};

export const EMPTY_PACKETS_BUNDLE : PacketsBundle = {
	local: {},
	remote: {}
};

export const urlHashArgs = z.object({
	//Note: when adding more arguments here, also add them to
	//actions:ingestHash and selectors:selectHashForCurrentState
	p: z.optional(permissivePacketName),
	t: z.optional(packetType),
	s: z.optional(seedID)
	//TODO: verify there aren't multiple unncessary UPDATE_HASH events.
});

export type URLHashArgs = z.infer<typeof urlHashArgs>;

const seedSelector = z.object({
	packetName : packetName,
	packetType : packetType,
	seedID: seedID
});

export type SeedSelector = z.infer<typeof seedSelector>;

export const EMPTY_SEED_SELECTOR : SeedSelector = {
	packetName: '',
	packetType: 'local',
	seedID: ''
};

export type Prompter = {
	prompt(question: string, defaultValue: LeafValue, options? : InputOptions): Promise<string>,
	providePromptResult(input: string) : void,
	providePromptFailure() : void
	confirm(question: string) : Promise<boolean>,
	provideConfirmResult(input : boolean): void,
	provideConfirmFailure(): void
};