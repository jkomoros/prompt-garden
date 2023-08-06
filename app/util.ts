import {
	Packets
} from './types.js';

const PACKETS_LOCAL_STORAGE_KEY = 'packets';

export const fetchPacketsFromStorage = () : Packets  => {
	const rawObject = window.localStorage.getItem(PACKETS_LOCAL_STORAGE_KEY);
	if (!rawObject) return {};
	return JSON.parse(rawObject) as Packets;
};

export const storePacketsToStorage = (packets : Packets) => {
	window.localStorage.setItem(PACKETS_LOCAL_STORAGE_KEY, JSON.stringify(packets, null, '\t'));
};
