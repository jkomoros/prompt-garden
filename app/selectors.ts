import { createSelector } from 'reselect';

import {
	PacketName,
	Packets,
	RootState,
} from './types.js';
import { SeedID, SeedPacket } from '../src/types.js';

export const selectPage = (state : RootState) => state.app ? state.app.page : '';
export const selectPageExtra = (state : RootState) => state.app ? state.app.pageExtra : '';
export const selectHash = (state : RootState) => state.app ? state.app.hash : '';

export const selectCurrentPacketName = (state : RootState) => state.data ? state.data.currentPacket : '';
export const selectCurrentSeedID = (state : RootState) => state.data ? state.data.currentSeed : '';
export const selectPackets = (state : RootState) => state.data ? state.data.packets : {};

export const selectDialogOpen = (state : RootState) => state.dialog ? state.dialog.open : false;
export const selectDialogKind = (state : RootState) => state.dialog ? state.dialog.kind : '';
export const selectDialogMessage = (state : RootState) => state.dialog ? state.dialog.message : '';

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