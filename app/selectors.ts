import { createSelector } from 'reselect';

import {
	PacketName,
	Packets,
	RootState,
} from './types.js';

export const selectPage = (state : RootState) => state.app ? state.app.page : '';
export const selectPageExtra = (state : RootState) => state.app ? state.app.pageExtra : '';
export const selectHash = (state : RootState) => state.app ? state.app.hash : '';

export const selectCurrentPacketName = (state : RootState) => state.data ? state.data.currentPacket : '';
export const selectCurrentSeedID = (state : RootState) => state.data ? state.data.currentSeed : '';
export const selectPackets = (state : RootState) => state.data ? state.data.packets : {};

export const selectCurrentPacket = createSelector(
	selectCurrentPacketName,
	selectPackets,
	(name : PacketName, packets : Packets) => packets[name]
);