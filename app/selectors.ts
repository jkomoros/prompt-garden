import {
	RootState,
} from './types.js';

export const selectPage = (state : RootState) => state.app ? state.app.page : '';
export const selectPageExtra = (state : RootState) => state.app ? state.app.pageExtra : '';
export const selectHash = (state : RootState) => state.app ? state.app.hash : '';

export const selectCurrentPacket = (state : RootState) => state.data ? state.data.currentPacket : '';
export const selectCurrentSeed = (state : RootState) => state.data ? state.data.currentSeed : '';
export const selectPackets = (state : RootState) => state.data ? state.data.packets : {};