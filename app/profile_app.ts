import {
	Profile
} from '../src/profile.js';

import {
	Packets
} from './types.js';

//This profile knows how to load local packets from state.
export class ProfileApp extends Profile {

	_packets : Packets;

	constructor(packets : Packets) {
		super();
		this._packets = packets;
	}

	override async localFetch(location: string): Promise<string> {
		const packet = this._packets[location];
		if (!packet) return '';
		return JSON.stringify(packet, null, '\t');
	}
}