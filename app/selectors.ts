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

export const selectPage = (state : RootState) => state.app ? state.app.page : '';
export const selectPageExtra = (state : RootState) => state.app ? state.app.pageExtra : '';
export const selectHash = (state : RootState) => state.app ? state.app.hash : '';

export const selectCurrentPacketName = (state : RootState) => state.data ? state.data.currentPacket : '';
export const selectCurrentSeedID = (state : RootState) => state.data ? state.data.currentSeed : '';
export const selectPackets = (state : RootState) => state.data ? state.data.packets : {};
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
	selectPackets,
	(environmentData, packets) => {
		//TODO; plug in a different profile
		const garden = new Garden(environmentData);
		for (const [name, packet] of Object.entries(packets)) {
			garden.plantSeedPacket(name, packet);
		}
		return garden;
	}
);