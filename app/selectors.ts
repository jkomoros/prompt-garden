import { createSelector } from 'reselect';

import {
	PacketName,
	Packets,
	RootState,
} from './types.js';

import {
	SeedID,
	SeedPacket
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

export const selectCurrentPacket = createSelector(
	selectCurrentPacketName,
	selectPackets,
	(name : PacketName, packets : Packets) => packets[name]
);

export const selectCurrentSeed = createSelector(
	selectCurrentPacket,
	selectCurrentSeedID,
	(packet : SeedPacket, seedID : SeedID) => packet.seeds[seedID]
);

export const selectGarden = createSelector(
	selectEnvironmentData,
	selectCurrentPacketName,
	selectCurrentPacket,
	selectPackets,
	(environmentData, packetName, packet, packets) => {
		//TODO; plug in a different profile
		const profile = new ProfileApp(packets);
		const garden = new Garden(environmentData, profile);
		//We only plant the currentPacket, because otherwise any validation
		//errors in ANY packets would lead to a seed not being able to be run.
		//In the future we'll pass a different Profile that has a localFetch
		//that can fetch other packets locally from the state.
		garden.plantSeedPacket(packetName, packet);
		return garden;
	}
);

export const selectEnvironment = createSelector(
	selectEnvironmentData,
	(data) => new Environment(data)
);