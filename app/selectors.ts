import { createSelector } from 'reselect';

import {
	PacketName,
	PacketType,
	PacketsBundle,
	WrappedPacket
} from './types.js';

import {
	RootState
} from './types_store.js';

import {
	SeedID
} from '../src/types.js';

import {
	Garden
} from '../src/garden.js';

import {
	Environment
} from '../src/environment.js';

import {
	ProfileApp
} from './profile_app.js';

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

export const selectProfile = createSelector(
	selectPackets,
	(packets) => new ProfileApp(packets)
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
		garden.plantSeedPacket(packetName, packet.data);
		return garden;
	}
);

export const selectEnvironment = createSelector(
	selectEnvironmentData,
	(data) => new Environment(data)
);