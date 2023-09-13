import { createSelector } from 'reselect';

import {
	PacketName,
	PacketType,
	PacketsBundle,
	URLHashArgs,
	WrappedPacket
} from './types.js';

import {
	RootState
} from './types_store.js';

import {
	SeedID, seedPacket
} from '../src/types.js';

import {
	Garden
} from '../src/garden.js';

import {
	Environment
} from '../src/environment.js';

import {
	ProfileBrowser
} from '../src/profile_browser.js';

import {
	getPacket
} from './util.js';

export const selectPage = (state : RootState) => state.app ? state.app.page : '';
export const selectPageExtra = (state : RootState) => state.app ? state.app.pageExtra : '';
export const selectHash = (state : RootState) => state.app ? state.app.hash : '';

export const selectCurrentPacketName = (state : RootState) => state.data ? state.data.currentPacket : '';
export const selectCurrentPacketType = (state : RootState) => state.data ? state.data.currentPacketType : 'local';
export const selectCurrentSeedID = (state : RootState) => state.data ? state.data.currentSeed : '';
export const selectPackets = (state : RootState) => state.data ? state.data.packets : {};
export const selectRemotePackets = (state : RootState) => state.data ? state.data.remotePackets : {};
export const selectEnvironmentData = (state : RootState) => state.data ? state.data.environment : {};

export const selectDialogOpen = (state : RootState) => state.dialog ? state.dialog.open : false;
export const selectDialogKind = (state : RootState) => state.dialog ? state.dialog.kind : '';
export const selectDialogMessage = (state : RootState) => state.dialog ? state.dialog.message : '';

export const selectGardenStatus = (state : RootState) => state.garden ? state.garden.status : 'idle';
export const selectGardenRef = (state : RootState) => state.garden ? state.garden.ref : {};
export const selectGardenSuccess = (state : RootState) => state.garden ? state.garden.success : false;
export const selectGardenResult = (state : RootState) => state.garden ? state.garden.result : null;
export const selectGardenError = (state : RootState) => state.garden ? state.garden.error : '';

export const selectPacketsBundle = createSelector(
	selectPackets,
	selectRemotePackets,
	(packets, remotePackets) : PacketsBundle => {
		return {
			local: packets,
			remote: remotePackets
		};
	}
);

export const selectCurrentPacket = createSelector(
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectPacketsBundle,
	(name : PacketName, typ : PacketType, bundle : PacketsBundle) => getPacket(bundle, name, typ)
);

export const selectCurrentSeed = createSelector(
	selectCurrentPacket,
	selectCurrentSeedID,
	(packet : WrappedPacket, seedID : SeedID) => packet.data.seeds[seedID]
);

export const selectCurrentSeedSelector = createSelector(
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeedID,
	(name, typ, seed) => ({packetName: name, packetType: typ, seedID: seed})
);

export const selectProfile = createSelector(
	selectPackets,
	(packets) => {
		const stringifiedPackets = Object.fromEntries(Object.entries(packets).map(entry => [entry[0], JSON.stringify(entry[1], null, '\t')]));
		return new ProfileBrowser(stringifiedPackets);
	}
);

export const selectGarden = createSelector(
	selectEnvironmentData,
	selectCurrentPacketName,
	selectCurrentPacket,
	selectProfile,
	(environmentData, packetName, packet, profile) => {
		const garden = new Garden(environmentData, profile);
		//We only plant the currentPacket, because otherwise any validation
		//errors in ANY packets would lead to a seed not being able to be run.
		//In the future we'll pass a different Profile that has a localFetch
		//that can fetch other packets locally from the state.
		const cleanedData = seedPacket.parse(packet.data);
		garden.plantSeedPacket(packetName, cleanedData);
		return garden;
	}
);

export const selectEnvironment = createSelector(
	selectEnvironmentData,
	(data) => new Environment(data)
);

export const selectHashForCurrentState = createSelector(
	selectCurrentPacketName,
	selectCurrentPacketType,
	selectCurrentSeedID,
	(packetName, packetType, seedID) => {
		const pieces : URLHashArgs = {};
		if (packetName) pieces.p = packetName;
		if (packetType && packetType != 'local') pieces.t = packetType;
		if (seedID) pieces.s = seedID;
		return Object.entries(pieces).map(entry => entry[0] + '=' + encodeURIComponent(entry[1])).join('&');
	}
);